param(
    [string]$OutDir = "../public/icons",
    [string]$BgColor = "#808080",
    [string]$Text = "NDK",
    [string]$TextColor = "#FFFFFF"
)

# Ensure output directory exists
$fullOutDir = Resolve-Path -Path (Join-Path $PSScriptRoot $OutDir) -ErrorAction SilentlyContinue
if (-not $fullOutDir) {
    New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot $OutDir) | Out-Null
    $fullOutDir = Resolve-Path -Path (Join-Path $PSScriptRoot $OutDir)
}

# Function to create icon
function New-IconPng {
    param(
        [int]$Size,
        [string]$FileName
    )

    Add-Type -AssemblyName System.Drawing

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    # High quality rendering settings
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Colors and brushes
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml([string]$BgColor)
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)

    # Draw rounded rectangle background
    $radius = [int]([math]::Round($Size * 0.18))
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = 2 * $radius
    if ($radius -gt 0) {
        $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
        $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
        $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
        $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
        $path.CloseFigure()
        $g.FillPath($bgBrush, $path)
    } else {
        $g.FillRectangle($bgBrush, $rect)
    }

    $textBrush = [System.Drawing.Brushes]::White
    # Use script-level TextColor param to ensure it's a string
    if ($Script:TextColor -and $Script:TextColor -ne "#FFFFFF") {
        $color = [System.Drawing.ColorTranslator]::FromHtml([string]$Script:TextColor)
        $textBrush = New-Object System.Drawing.SolidBrush($color)
    }

    # Auto-fit text within a safe area with padding (avoid corners)
    $padding = [int]([math]::Round($Size * 0.14))
    $safeWidth = $Size - (2 * $padding)
    $safeHeight = $Size - (2 * $padding)

    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    # Start with a large size and shrink until it fits
    $font = $null
    $fontSize = [int]([math]::Round($Size * 0.6))
    while ($fontSize -ge 8) {
        if ($font) { $font.Dispose() }
        try {
            $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        } catch {
            $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        }
        $stringSize = $g.MeasureString($Text, $font)
        if (($stringSize.Width -le $safeWidth) -and ($stringSize.Height -le $safeHeight)) {
            break
        }
        $fontSize -= 2
    }

    $textRect = New-Object System.Drawing.RectangleF($padding, $padding, $safeWidth, $safeHeight)
    $g.DrawString($Text, $font, $textBrush, $textRect, $format)

    $outPath = Join-Path $fullOutDir $FileName
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Cleanup
    if ($path) { $path.Dispose() }
    $bgBrush.Dispose()
    if ($font) { $font.Dispose() }
    $format.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

New-IconPng -Size 192 -FileName "ndk-192.png"
New-IconPng -Size 512 -FileName "ndk-512.png"
Write-Host "Icons generated in $fullOutDir"