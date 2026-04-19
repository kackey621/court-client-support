#!/usr/bin/env bash
#
# NDLOCR-Lite ランナーを PyInstaller --onedir で一括バンドルし
# resources/ndlocr/<platform>/ に配置する。
#
# 対象 OS: macOS / Linux
# 実行前提: システムに python3 (3.10+) が入っていること
#           (エンドユーザー環境には不要。ビルド側のみ)
#
# 使い方:
#   ./scripts/build-ndlocr.sh            # 現在の OS でビルド
#   PLATFORM_DIR=linux ./scripts/build-ndlocr.sh  # サブディレクトリ名を上書き
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY_DIR="$ROOT/python"

# プラットフォーム判定
UNAME="$(uname -s)"
case "$UNAME" in
  Darwin)  DEFAULT_PLATFORM="mac" ;;
  Linux)   DEFAULT_PLATFORM="linux" ;;
  *)       DEFAULT_PLATFORM="unknown" ;;
esac
PLATFORM_DIR="${PLATFORM_DIR:-$DEFAULT_PLATFORM}"

OUT_DIR="$ROOT/resources/ndlocr/$PLATFORM_DIR"
NAME="ndlocr_runner"

echo "→ ビルドプラットフォーム: $PLATFORM_DIR"
echo "→ 出力先: $OUT_DIR"

cd "$PY_DIR"

if [[ ! -d .venv ]]; then
  echo "→ Python 仮想環境を作成"
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

echo "→ 依存関係をインストール"
pip install --upgrade pip wheel
pip install -r requirements.txt

# モデルディレクトリ (存在すればバンドル)
ADD_DATA_ARG=()
if [[ -d "$PY_DIR/models" ]]; then
  # macOS/Linux は ':' 区切り
  ADD_DATA_ARG=(--add-data "$PY_DIR/models:models")
  echo "→ モデルディレクトリを同梱: $PY_DIR/models"
else
  echo "  (models/ が未配置 — 初回モデルダウンロードで補完する前提)"
fi

echo "→ PyInstaller で --onedir バンドルを作成"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

pyinstaller \
  --onedir \
  --name "$NAME" \
  --distpath "$OUT_DIR.staging" \
  --workpath "$PY_DIR/build" \
  --specpath "$PY_DIR/build" \
  --noconfirm \
  --clean \
  --collect-all ndlocr_lite \
  --collect-all pypdfium2 \
  "${ADD_DATA_ARG[@]}" \
  ndlocr_runner.py

# PyInstaller は <distpath>/<name>/ に展開するので中身を out_dir へ移動
mv "$OUT_DIR.staging/$NAME"/* "$OUT_DIR/"
rm -rf "$OUT_DIR.staging"

# 実行権限を付与
chmod +x "$OUT_DIR/$NAME" || true

echo "✔ 完了: $OUT_DIR/$NAME"
echo
echo "バンドルサイズ:"
du -sh "$OUT_DIR"
