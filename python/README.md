# NDLOCR-Lite ランナー

CourtStrategies アプリが子プロセスとして呼び出す Python スクリプトと、
PyInstaller で作成する OS 別配布バンドルのエントリーポイントです。

> **エンドユーザーはこのディレクトリを意識する必要はありません。**
> 完成したアプリのインストーラー (DMG / EXE / AppImage / DEB) の中に
> Python ランタイム・NDLOCR-Lite・モデル・pypdfium2 が同梱されています。

## 依存 (pip 経由のみ、OS パッケージ不要)

```
ndlocr-lite      # NDLOCR-Lite 本体
pypdfium2        # PDFium をバンドル済み → poppler などの OS 依存なし
pillow           # 画像処理
pyinstaller      # ビルド時のみ使用
```

## ビルド (開発者向け)

リポジトリルートから:

```bash
# macOS / Linux
./scripts/build-ndlocr.sh

# Windows
pwsh -File scripts/build-ndlocr.ps1
```

成果物はリポジトリの `resources/ndlocr/<os>/` に配置され、そのまま
`electron-builder` が各 OS のインストーラーに取り込みます
(詳細は [docs/BUILD.md](../docs/BUILD.md))。

## ローカル実行 (フォールバック)

バイナリが未生成でも、ビルドホストにシステム Python が入っていれば
dev 時に `python3 python/ndlocr_runner.py ...` へフォールバックします。

```bash
cd python
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 単体実行テスト
python ndlocr_runner.py --check
python ndlocr_runner.py /path/to/sample.pdf --lang jpn
```

## I/O 仕様

```
argv: <input_path> [--lang jpn] [--check]

stdout (1 行, UTF-8 JSON):
{
  "text":  "全ページを結合したテキスト",
  "pages": [{ "page": 1, "text": "..." }, ...],
  "error": null
}

stderr (NDJSON, 1 行 1 イベント):
{ "type": "progress", "status": "ocr", "progress": 0.42, "message": "2/5 ページ" }

exit 0 = 成功 / 非 0 = 失敗 (stdout に {"error":"..."})
```

## モデル重み

`python/models/` にモデルファイルを置くと、PyInstaller が
`--add-data` で内部リソースに同梱し、実行時に `sys._MEIPASS/models/` から
ロードします。モデルが巨大でインストーラーに入れたくない場合は、
メインプロセス側で初回起動時にユーザーデータディレクトリへダウンロード
する方式へ切り替え可能です (未実装、拡張点)。
