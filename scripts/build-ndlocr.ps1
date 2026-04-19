# NDLOCR-Lite ランナーを PyInstaller --onedir で一括バンドルし
# resources\ndlocr\win\ に配置する (Windows 用)。
#
# 実行前提:
#   - PowerShell 5+ または PowerShell Core 7+
#   - python (3.10+) が PATH 上に存在
#
# 使い方:
#   pwsh -File scripts/build-ndlocr.ps1

$ErrorActionPreference = 'Stop'

$ROOT = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$PY_DIR = Join-Path $ROOT 'python'
$OUT_DIR = Join-Path $ROOT 'resources\ndlocr\win'
$NAME = 'ndlocr_runner'

Write-Host "→ ビルドプラットフォーム: win"
Write-Host "→ 出力先: $OUT_DIR"

Set-Location $PY_DIR

if (-not (Test-Path '.venv')) {
  Write-Host '→ Python 仮想環境を作成'
  python -m venv .venv
}

# venv をアクティベート
$venvActivate = Join-Path $PY_DIR '.venv\Scripts\Activate.ps1'
. $venvActivate

Write-Host '→ 依存関係をインストール'
python -m pip install --upgrade pip wheel
pip install -r requirements.txt

$addDataArgs = @()
$modelsDir = Join-Path $PY_DIR 'models'
if (Test-Path $modelsDir) {
  # Windows は ';' 区切り
  $addDataArgs += @('--add-data', "$modelsDir;models")
  Write-Host "→ モデルディレクトリを同梱: $modelsDir"
} else {
  Write-Host '  (models/ が未配置)'
}

Write-Host '→ PyInstaller で --onedir バンドルを作成'
if (Test-Path $OUT_DIR) {
  Remove-Item -Recurse -Force $OUT_DIR
}
New-Item -ItemType Directory -Path $OUT_DIR | Out-Null

$staging = "$OUT_DIR.staging"
pyinstaller `
  --onedir `
  --name $NAME `
  --distpath $staging `
  --workpath (Join-Path $PY_DIR 'build') `
  --specpath (Join-Path $PY_DIR 'build') `
  --noconfirm `
  --clean `
  --collect-all ndlocr_lite `
  --collect-all pypdfium2 `
  @addDataArgs `
  (Join-Path $PY_DIR 'ndlocr_runner.py')

# staging/<NAME>/* を OUT_DIR へ移動
Move-Item -Path (Join-Path $staging "$NAME\*") -Destination $OUT_DIR -Force
Remove-Item -Recurse -Force $staging

$exePath = Join-Path $OUT_DIR "$NAME.exe"
if (Test-Path $exePath) {
  Write-Host "✔ 完了: $exePath"
  $size = (Get-ChildItem $OUT_DIR -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
  Write-Host ("バンドルサイズ: {0:N1} MB" -f $size)
} else {
  Write-Error 'ビルド成果物が見つかりません'
}
