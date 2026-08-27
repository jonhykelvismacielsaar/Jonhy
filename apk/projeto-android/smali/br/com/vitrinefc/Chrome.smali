.class public Lbr/com/vitrinefc/Chrome;
.super Landroid/webkit/WebChromeClient;
.source "Chrome.java"

.field private act:Lbr/com/vitrinefc/MainActivity;

.method public constructor <init>(Lbr/com/vitrinefc/MainActivity;)V
    .locals 0
    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V
    iput-object p1, p0, Lbr/com/vitrinefc/Chrome;->act:Lbr/com/vitrinefc/MainActivity;
    return-void
.end method

.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .locals 3
    sput-object p2, Lbr/com/vitrinefc/MainActivity;->sCallback:Landroid/webkit/ValueCallback;
    invoke-virtual {p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->createIntent()Landroid/content/Intent;
    move-result-object v0
    iget-object v1, p0, Lbr/com/vitrinefc/Chrome;->act:Lbr/com/vitrinefc/MainActivity;
    const/4 v2, 0x1
    invoke-virtual {v1, v0, v2}, Lbr/com/vitrinefc/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    const/4 v2, 0x1
    return v2
.end method
