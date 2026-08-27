#!/usr/bin/env python3
"""Assinador de APK (esquema v1/JAR) em Python puro — Vitrine FC."""
import base64
import datetime
import hashlib
import sys
import zipfile

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs7
from cryptography.x509.oid import NameOID

SRC, DST = sys.argv[1], sys.argv[2]

# ---------- 1. chave + certificado autoassinado ----------
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
name = x509.Name([
    x509.NameAttribute(NameOID.COMMON_NAME, u"Vitrine FC"),
    x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"Vitrine FC"),
    x509.NameAttribute(NameOID.COUNTRY_NAME, u"BR"),
])
now = datetime.datetime.now(datetime.timezone.utc)
cert = (x509.CertificateBuilder()
        .subject_name(name).issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=10000))
        .sign(key, hashes.SHA256()))

# salva a chave para futuras atualizações do app
with open("vitrine-key.pem", "wb") as f:
    f.write(key.private_bytes(serialization.Encoding.PEM,
                              serialization.PrivateFormat.PKCS8,
                              serialization.NoEncryption()))
with open("vitrine-cert.pem", "wb") as f:
    f.write(cert.public_bytes(serialization.Encoding.PEM))

# ---------- 2. lê o APK e calcula os digests ----------
zin = zipfile.ZipFile(SRC, "r")
entries = [i for i in zin.infolist() if not i.filename.startswith("META-INF/") and not i.filename.endswith("/")]

def b64sha256(data):
    return base64.b64encode(hashlib.sha256(data).digest()).decode()

# MANIFEST.MF
mf = b"Manifest-Version: 1.0\r\nCreated-By: 1.0 (Vitrine FC)\r\n\r\n"
sections = {}
for e in entries:
    sec = ("Name: " + e.filename + "\r\nSHA-256-Digest: " +
           b64sha256(zin.read(e.filename)) + "\r\n\r\n").encode()
    sections[e.filename] = sec
    mf += sec

# CERT.SF
sf = (b"Signature-Version: 1.0\r\nCreated-By: 1.0 (Vitrine FC)\r\n"
      b"SHA-256-Digest-Manifest: " + b64sha256(mf).encode() + b"\r\n\r\n")
for e in entries:
    sf += ("Name: " + e.filename + "\r\nSHA-256-Digest: " +
           b64sha256(sections[e.filename]) + "\r\n\r\n").encode()

# CERT.RSA (PKCS#7 destacado, DER)
rsa_sig = (pkcs7.PKCS7SignatureBuilder()
           .set_data(bytes(sf))
           .add_signer(cert, key, hashes.SHA256())
           .sign(serialization.Encoding.DER,
                 [pkcs7.PKCS7Options.DetachedSignature,
                  pkcs7.PKCS7Options.Binary,
                  pkcs7.PKCS7Options.NoAttributes]))

# ---------- 3. escreve o APK assinado ----------
zout = zipfile.ZipFile(DST, "w", zipfile.ZIP_DEFLATED)
zout.writestr("META-INF/MANIFEST.MF", mf)
zout.writestr("META-INF/CERT.SF", bytes(sf))
zout.writestr("META-INF/CERT.RSA", rsa_sig)
for e in entries:
    zout.writestr(e, zin.read(e.filename))
zout.close()
zin.close()
print("APK assinado com sucesso:", DST)
