# 謝辞 / Acknowledgments

本プロジェクトは以下のオープンソースソフトウェア・公開 API・公開データセットの上に
成り立っています。素晴らしい成果を無償で公開してくださっている作者・コミュニティの
皆様に深く感謝いたします。

---

## OCR / 文書処理

| プロジェクト | 用途 | ライセンス |
|---|---|---|
| [NDLOCR-Lite](https://github.com/ndl-lab) — 国立国会図書館 | メイン OCR エンジン（日本語古典・近代文書に最適化） | CC BY 4.0 |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | フォールバック OCR | Apache-2.0 |
| [pypdfium2](https://github.com/pypdfium2-team/pypdfium2) | PDF ページ画像化（システム poppler 不要） | Apache-2.0 / BSD-3-Clause |
| [PDFium](https://pdfium.googlesource.com/pdfium/) | pypdfium2 が同梱する PDF エンジン | BSD-3-Clause / Apache-2.0 |
| [Pillow](https://github.com/python-pillow/Pillow) | Python 側画像処理 | MIT-CMU |

## デスクトップ基盤

| プロジェクト | 用途 | ライセンス |
|---|---|---|
| [Electron](https://www.electronjs.org/) | クロスプラットフォームデスクトップ基盤 | MIT |
| [electron-vite](https://electron-vite.org/) | 開発サーバー・ビルド | MIT |
| [electron-builder](https://www.electron.build/) | インストーラー生成 (dmg / nsis / AppImage / deb) | MIT |
| [@electron-toolkit](https://github.com/alex8088/electron-toolkit) | Preload / IPC ユーティリティ | MIT |
| [PyInstaller](https://pyinstaller.org/) | Python ランタイム同梱バンドル生成 | GPL-2.0-or-later (runtime exception) |

## UI

| プロジェクト | 用途 | ライセンス |
|---|---|---|
| [React](https://react.dev/) | UI ライブラリ | MIT |
| [React Router](https://reactrouter.com/) | ルーティング | MIT |
| [Zustand](https://github.com/pmndrs/zustand) | 状態管理 | MIT |
| [Tailwind CSS](https://tailwindcss.com/) | スタイリング | MIT |
| [Lucide](https://lucide.dev/) | アイコンセット | ISC |
| [PostCSS](https://postcss.org/) / [Autoprefixer](https://github.com/postcss/autoprefixer) | CSS ビルド | MIT |

## データ・検索

| プロジェクト | 用途 | ライセンス |
|---|---|---|
| [SQLite](https://www.sqlite.org/) | 組込みデータベース（FTS5 全文検索含む） | Public Domain |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Node.js 向け SQLite バインディング | MIT |
| [Fuse.js](https://www.fusejs.io/) | あいまい検索 | Apache-2.0 |

## ファイル処理

| プロジェクト | 用途 | ライセンス |
|---|---|---|
| [adm-zip](https://github.com/cthackers/adm-zip) | ZIP 展開・インポート | MIT |
| [mammoth](https://github.com/mwilliamson/mammoth.js) | `.docx` → HTML 変換 | BSD-2-Clause |
| [docx](https://github.com/dolanmiu/docx) | `.docx` 出力 | MIT |

## 開発ツール

| プロジェクト | ライセンス |
|---|---|
| [TypeScript](https://www.typescriptlang.org/) | Apache-2.0 |
| [Vite](https://vitejs.dev/) | MIT |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | MIT |
| [Node.js](https://nodejs.org/) | MIT ほか |

---

## 外部 API・公開データ

| 提供者 | API / データ | 備考 |
|---|---|---|
| [デジタル庁・e-gov 法令 API v2](https://laws.e-gov.go.jp/api/2/swagger-ui) | 法令検索・条文取得 | 公開 API、登録不要 |
| [裁判所 判例検索](https://www.courts.go.jp/app/hanrei_jp/) | 判例検索リンク生成 | 外部リンクのみ、スクレイピング等は行っていません |
| [D1-Law.com](https://www.d1-law.com/) | 判例検索リンク生成 | 同上 |
| [Google Gemini API](https://ai.google.dev/) | AI 要約・Q&A | ユーザー自身で API キーを設定、Google の [利用規約](https://ai.google.dev/terms) に準拠 |

---

## その他

本プロジェクトは各ライブラリのライセンス条件に従って配布しています。
同梱する OSS のライセンス全文は、配布パッケージに含まれる NOTICES / LICENSES ディレクトリ
（将来追加予定）、および上記各プロジェクトの公式リポジトリで確認できます。

本プロジェクト自体のライセンスは [LICENSE](LICENSE) （MIT）を参照してください。
