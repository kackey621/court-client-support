# ビルド・配布ガイド

エンドユーザーが **追加インストール操作なしで** 使えるインストーラーを
3 プラットフォーム分作成する手順です。

## 方針

- **Python / NDLOCR-Lite / PyTorch / pypdfium2 / モデルは全てインストーラー内に同梱**
- **システム依存パッケージ (poppler 等) は使用しない**
  - PDF レンダリングは `pypdfium2` (PDFium を pip パッケージに同梱)
  - Python 本体は PyInstaller `--onedir` で同梱
- エンドユーザー側は DMG / EXE / AppImage / DEB を実行するだけ

## プロジェクト構造

```
python/                 Python ランタイム + NDLOCR ランナー
  ndlocr_runner.py      エントリーポイント
  requirements.txt      pip 依存 (ndlocr-lite, pypdfium2, pillow, pyinstaller)
  models/               NDLOCR モデル重み (任意、バンドル時のみ)

scripts/
  build-ndlocr.sh       macOS / Linux 用ビルド
  build-ndlocr.ps1      Windows 用ビルド

resources/ndlocr/       ← PyInstaller 出力を OS 別サブディレクトリで受ける
  mac/                  macOS バンドル
  win/                  Windows バンドル
  linux/                Linux バンドル

.github/workflows/
  build.yml             3 OS マトリクスで DMG / NSIS / AppImage を自動生成
```

## ローカルでビルド

### 前提

ビルドホストに以下が必要 (**エンドユーザーには不要**):

- Node.js 20+
- Python 3.10+
- (macOS) Xcode コマンドラインツール
- (Windows) Visual Studio Build Tools (native モジュール用)
- (Linux) `build-essential`, `rpm`, `libfuse2`

### macOS

```bash
npm ci
npm run rebuild          # better-sqlite3 を Electron 用にリビルド
npm run package:mac      # → dist/CourtStrategies-x.y.z-mac-*.dmg
```

### Windows

```powershell
npm ci
npm run rebuild
npm run package:win      # → dist/CourtStrategies-x.y.z-win-x64.exe
```

### Linux

```bash
npm ci
npm run rebuild
npm run package:linux    # → dist/CourtStrategies-x.y.z-linux-x64.AppImage  (+ .deb)
```

各コマンドは内部で `scripts/build-ndlocr.*` を呼び、Python バンドルを
`resources/ndlocr/<os>/` に生成してから electron-builder でパッケージ化します。

## GitHub Actions (推奨)

タグ `vX.Y.Z` を push すると、`macOS / Windows / Ubuntu` のランナー上で
並列にビルドし、GitHub Release のドラフトに全成果物を添付します。

```bash
git tag v1.0.0
git push --tags
```

### シークレット設定 (macOS 署名・公証)

| Secret | 用途 |
|---|---|
| `MAC_CSC_LINK`                | Developer ID Application 証明書 (base64) |
| `MAC_CSC_KEY_PASSWORD`        | 証明書パスワード |
| `APPLE_ID`                    | 公証用 Apple ID |
| `APPLE_APP_SPECIFIC_PASSWORD` | app 専用パスワード |
| `APPLE_TEAM_ID`               | Team ID |

シークレット未設定でもビルド自体は通りますが、未署名 DMG となります。

## 同梱サイズの目安

| コンポーネント | サイズ (圧縮前) |
|---|---|
| Electron ランタイム | 180 MB |
| Python 3.11 ランタイム | 30 MB |
| PyTorch CPU | 200 MB |
| NDLOCR-Lite + モデル | 100〜500 MB |
| pypdfium2 | 10 MB |
| **合計 (インストーラー)** | **約 500 MB〜900 MB** |

モデルが大きい場合は、`python/ndlocr_runner.py` の `_bundled_model_dir`
を拡張して初回起動時にユーザーデータディレクトリへダウンロードする方式にも
切り替えられます。

## 動作確認

インストール後、以下が自動で動くことを確認:

1. アプリ起動
2. ドキュメントをインポート (PDF / 画像)
3. 詳細画面の OCR タブで「待機中 → 処理中 → 完了」と表示されること
4. `ocr_text` が FTS5 検索の結果に出現すること

OCR が `error` で止まる場合は、OCRPanel のエラーメッセージと
開発者ツールのログ (`View > Toggle Developer Tools`) を確認。
