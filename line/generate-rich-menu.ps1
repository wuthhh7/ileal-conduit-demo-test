param(
  [string]$OutputPath = (Join-Path $PSScriptRoot 'rich-menu-3.jpg'),
  [string]$ArtworkPath = (Join-Path $PSScriptRoot 'rich-menu-art.png')
)

# The current menu includes integrated typography; use its export path by default.
if ($ArtworkPath -eq (Join-Path $PSScriptRoot 'rich-menu-art.png')) {
  & (Join-Path $PSScriptRoot 'export-rich-menu.ps1')
  if ($OutputPath -ne (Join-Path $PSScriptRoot 'rich-menu-3.jpg')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'rich-menu-3.jpg') -Destination $OutputPath
  }
  return
}
Add-Type -AssemblyName System.Drawing

function New-Brush([string]$Color) {
  return [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
}

function New-Pen([string]$Color, [float]$Width = 12) {
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($Color), $Width)
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  return $pen
}

function New-RoundedPath([float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Fill-RoundedRect($Graphics, [string]$Color, [float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius) {
  $path = New-RoundedPath $X $Y $Width $Height $Radius
  $brush = New-Brush $Color
  $Graphics.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()
}

function Fill-RoundedRectAlpha($Graphics, [string]$Color, [int]$Alpha, [float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius) {
  $path = New-RoundedPath $X $Y $Width $Height $Radius
  $baseColor = [System.Drawing.ColorTranslator]::FromHtml($Color)
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb($Alpha, $baseColor))
  $Graphics.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()
}

function Draw-RoundedRect($Graphics, [string]$Color, [float]$StrokeWidth, [float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius) {
  $path = New-RoundedPath $X $Y $Width $Height $Radius
  $pen = New-Pen $Color $StrokeWidth
  $Graphics.DrawPath($pen, $path)
  $pen.Dispose()
  $path.Dispose()
}

function Draw-Text($Graphics, [string]$Text, [string]$Color, [float]$Size, [System.Drawing.FontStyle]$Style, [float]$X, [float]$Y, [float]$Width, [float]$Height, [System.Drawing.StringAlignment]$Align = [System.Drawing.StringAlignment]::Near) {
  $font = [System.Drawing.Font]::new('Tahoma', $Size, $Style, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Brush $Color
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = $Align
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $format.Trimming = [System.Drawing.StringTrimming]::EllipsisCharacter
  $Graphics.DrawString($Text, $font, $brush, [System.Drawing.RectangleF]::new($X, $Y, $Width, $Height), $format)
  $format.Dispose()
  $brush.Dispose()
  $font.Dispose()
}

function Draw-PlayTriangle($Graphics, [float]$CenterX, [float]$CenterY, [float]$Size, [string]$Color) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddPolygon([System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($CenterX - $Size * 0.34, $CenterY - $Size * 0.52),
    [System.Drawing.PointF]::new($CenterX - $Size * 0.34, $CenterY + $Size * 0.52),
    [System.Drawing.PointF]::new($CenterX + $Size * 0.54, $CenterY)
  ))
  $brush = New-Brush $Color
  $Graphics.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()
}

function Draw-VideoIllustration($Graphics, [float]$X, [float]$Y) {
  Fill-RoundedRect $Graphics '#E7F8FC' $X $Y 780 450 44
  Draw-RoundedRect $Graphics '#FFFFFF' 24 ($X + 36) ($Y + 36) 708 332 32
  Fill-RoundedRect $Graphics '#0C82A4' ($X + 262) ($Y + 101) 255 198 64
  Draw-PlayTriangle $Graphics ($X + 389) ($Y + 200) 96 '#FFFFFF'
  $pen = New-Pen '#A8DCE8' 18
  $Graphics.DrawLine($pen, $X + 135, $Y + 405, $X + 645, $Y + 405)
  $pen.Dispose()
}

function Draw-ProfileIllustration($Graphics, [float]$X, [float]$Y) {
  Fill-RoundedRect $Graphics '#FFFFFF' $X $Y 475 330 46
  Draw-RoundedRect $Graphics '#0C6381' 19 ($X + 36) ($Y + 36) 403 258 34
  $avatar = New-Brush '#0C82A4'
  $Graphics.FillEllipse($avatar, $X + 163, $Y + 74, 148, 148)
  $Graphics.FillEllipse($avatar, $X + 114, $Y + 187, 246, 70)
  $avatar.Dispose()
  $line = New-Pen '#7AC6D8' 15
  $Graphics.DrawLine($line, $X + 72, $Y + 90, $X + 130, $Y + 90)
  $Graphics.DrawLine($line, $X + 72, $Y + 138, $X + 130, $Y + 138)
  $line.Dispose()
}

function Draw-SymptomIllustration($Graphics, [float]$X, [float]$Y) {
  Fill-RoundedRect $Graphics '#FFFFFF' $X $Y 475 330 46
  $bubble = New-Brush '#0C5A78'
  $path = New-RoundedPath ($X + 55) ($Y + 50) 365 205 42
  $Graphics.FillPath($bubble, $path)
  $path.Dispose()
  $bubble.Dispose()
  $tail = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $tail.AddPolygon([System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($X + 135, $Y + 235),
    [System.Drawing.PointF]::new($X + 185, $Y + 235),
    [System.Drawing.PointF]::new($X + 145, $Y + 285)
  ))
  $tailBrush = New-Brush '#0C5A78'
  $Graphics.FillPath($tailBrush, $tail)
  $tailBrush.Dispose()
  $tail.Dispose()
  $warning = New-Brush '#FCD34D'
  $Graphics.FillEllipse($warning, $X + 194, $Y + 86, 88, 88)
  $warning.Dispose()
  Draw-Text -Graphics $Graphics -Text '!' -Color '#0C5A78' -Size 68 -Style ([System.Drawing.FontStyle]::Bold) -X ($X + 194) -Y ($Y + 84) -Width 88 -Height 92 -Align ([System.Drawing.StringAlignment]::Center)
}

$width = 2500
$height = 1686
$bitmap = [System.Drawing.Bitmap]::new($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#53CBD3'))

if (-not (Test-Path -LiteralPath $ArtworkPath)) {
  throw "Rich menu artwork was not found: $ArtworkPath"
}

# Generated illustration is intentionally stretched a fraction to LINE's exact 2500×1686 canvas.
$artwork = [System.Drawing.Image]::FromFile($ArtworkPath)
$graphics.DrawImage($artwork, [System.Drawing.Rectangle]::new(0, 0, $width, $height))
$artwork.Dispose()

# Large left action — copy is overlaid locally so Thai labels remain crisp and accessible.
Fill-RoundedRectAlpha $graphics '#FFFFFF' 220 605 90 945 340 62
Draw-Text -Graphics $graphics -Text 'ILIEAL CONDUIT CARE' -Color '#127F95' -Size 37 -Style ([System.Drawing.FontStyle]::Bold) -X 690 -Y 126 -Width 780 -Height 52 -Align ([System.Drawing.StringAlignment]::Center)
Draw-Text -Graphics $graphics -Text 'วิดีโอสำหรับผู้ป่วย' -Color '#13345D' -Size 82 -Style ([System.Drawing.FontStyle]::Bold) -X 660 -Y 178 -Width 860 -Height 104 -Align ([System.Drawing.StringAlignment]::Center)
Draw-Text -Graphics $graphics -Text 'เลือกชมคลิปการดูแลตนเอง' -Color '#246278' -Size 40 -Style ([System.Drawing.FontStyle]::Regular) -X 675 -Y 285 -Width 830 -Height 68 -Align ([System.Drawing.StringAlignment]::Center)
Fill-RoundedRect $graphics '#158EA3' 770 402 660 132 42
Draw-Text -Graphics $graphics -Text 'แตะเพื่อรับชม' -Color '#FFFFFF' -Size 45 -Style ([System.Drawing.FontStyle]::Bold) -X 800 -Y 430 -Width 600 -Height 72 -Align ([System.Drawing.StringAlignment]::Center)

# Upper right action.
Draw-Text -Graphics $graphics -Text 'กรอกประวัติ' -Color '#13345D' -Size 64 -Style ([System.Drawing.FontStyle]::Bold) -X 1690 -Y 680 -Width 720 -Height 76 -Align ([System.Drawing.StringAlignment]::Center)
Draw-Text -Graphics $graphics -Text 'บันทึกข้อมูลผู้ป่วย' -Color '#246278' -Size 33 -Style ([System.Drawing.FontStyle]::Regular) -X 1690 -Y 750 -Width 720 -Height 48 -Align ([System.Drawing.StringAlignment]::Center)

# Lower right action.
Draw-Text -Graphics $graphics -Text 'แจ้งอาการ' -Color '#13345D' -Size 64 -Style ([System.Drawing.FontStyle]::Bold) -X 1690 -Y 1505 -Width 720 -Height 76 -Align ([System.Drawing.StringAlignment]::Center)
Draw-Text -Graphics $graphics -Text 'ส่งเรื่องให้ทีมพยาบาล' -Color '#246278' -Size 33 -Style ([System.Drawing.FontStyle]::Regular) -X 1690 -Y 1575 -Width 720 -Height 48 -Align ([System.Drawing.StringAlignment]::Center)

$quality = [System.Drawing.Imaging.Encoder]::Quality
$parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
$parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new($quality, [int64]88)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$bitmap.Save($OutputPath, $codec, $parameters)
$parameters.Dispose()
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Created $OutputPath"
