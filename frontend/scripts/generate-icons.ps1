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
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.Clear([System.Drawing.ColorTranslator]::FromHtml($BgColor))

    # Choose font size proportional to size
    $fontSize = [int]($Size * 0.5)
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

    $textBrush = [System.Drawing.Brushes]::White
    # Use script-level TextColor param to ensure it's a string
    if ($Script:TextColor -and $Script:TextColor -ne "#FFFFFF") {
        $color = [System.Drawing.ColorTranslator]::FromHtml([string]$Script:TextColor)
        $textBrush = New-Object System.Drawing.SolidBrush($color)
    }

    $stringSize = $g.MeasureString($Text, $font)
    $x = ($Size - $stringSize.Width) / 2
    $y = ($Size - $stringSize.Height) / 2

    $g.DrawString($Text, $font, $textBrush, $x, $y)

    $outPath = Join-Path $fullOutDir $FileName
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
}

New-IconPng -Size 192 -FileName "ndk-192.png"
New-IconPng -Size 512 -FileName "ndk-512.png"
Write-Host "Icons generated in $fullOutDir"