.class public Lbr/com/vitrinefc/Client;
.super Landroid/webkit/WebViewClient;
.source "Client.java"

.method public constructor <init>()V
    .locals 0
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V
    return-void
.end method

.method public onReceivedError(Landroid/webkit/WebView;ILjava/lang/String;Ljava/lang/String;)V
    .locals 1
    const-string v0, "file:///android_asset/error.html"
    invoke-virtual {p1, v0}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    return-void
.end method
