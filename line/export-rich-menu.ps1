Add-Type -AssemblyName System.Drawing
$source = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot 'rich-menu-final.png'))
$bitmap = [System.Drawing.Bitmap]::new(2500, 1686)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, 2500, 1686))
$parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
$parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [int64]92)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$bitmap.Save((Join-Path $PSScriptRoot 'rich-menu-3.jpg'), $codec, $parameters)
$parameters.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
$source.Dispose()
