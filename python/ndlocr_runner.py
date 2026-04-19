#!/usr/bin/env python3
"""
NDLOCR-Lite ランナー (CourtStrategies 組み込み用)

Electron メインプロセスが child_process.spawn でこのスクリプト
(または PyInstaller でビルドした単一バイナリ/ディレクトリ) を呼び出します。

stdin/argv から入力ファイルを受け取り、以下を返します:

  stdout : 最終結果 JSON (1 行, UTF-8)
    {
      "text": "全ページを結合したテキスト",
      "pages": [{ "page": 1, "text": "..." }, ...],
      "error": null
    }

  stderr : 進捗イベント JSON (NDJSON, 1 行 1 イベント)
    { "type": "progress", "status": "ocr", "progress": 0.42, "message": "2/5" }

Exit code: 0 = 成功, 非 0 = 失敗 (stdout に {"error": "..."} を出力)

依存:
  - pypdfium2  (PDF レンダリング — OS 非依存, pip install のみで完結)
  - ndlocr_lite (OCR エンジン本体)
  - pillow
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
from pathlib import Path


def emit_result(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))
    sys.stdout.write("\n")
    sys.stdout.flush()


def emit_progress(status: str, progress: float, message: str = "") -> None:
    sys.stderr.write(
        json.dumps(
            {"type": "progress", "status": status, "progress": progress, "message": message},
            ensure_ascii=False,
        )
    )
    sys.stderr.write("\n")
    sys.stderr.flush()


def _bundled_model_dir() -> Path | None:
    """PyInstaller でバンドルされたモデルディレクトリを解決する。"""
    # PyInstaller (--onedir / --onefile) は実行時に sys._MEIPASS をセット
    base = getattr(sys, "_MEIPASS", None)
    if base:
        p = Path(base) / "models"
        if p.exists():
            return p
    # 開発時は python/models/ を参照
    dev = Path(__file__).resolve().parent / "models"
    return dev if dev.exists() else None


def _load_ocr(lang: str):
    """NDLOCR-Lite の初期化。"""
    try:
        from ndlocr_lite import NDLOCR  # type: ignore
    except ImportError as e:
        raise RuntimeError(
            "NDLOCR-Lite がインストールされていません。"
            "pyproject の pip install を確認してください。"
        ) from e

    model_dir = _bundled_model_dir()
    kwargs: dict = {"lang": lang}
    if model_dir is not None:
        # NDLOCR-Lite が model_dir 引数を受け付ける想定 (実装に合わせ調整)
        kwargs["model_dir"] = str(model_dir)

    return NDLOCR(**kwargs)


def _pdf_pages_to_images(path: Path):
    """pypdfium2 で PDF を PIL.Image のリストに変換 (poppler 不要)。"""
    import pypdfium2 as pdfium  # type: ignore

    pdf = pdfium.PdfDocument(str(path))
    try:
        for i in range(len(pdf)):
            page = pdf[i]
            # 300 DPI 相当 (scale = 300/72 ≒ 4.166)
            pil = page.render(scale=300 / 72).to_pil()
            yield pil
    finally:
        pdf.close()


def _extract_text(result) -> str:
    if isinstance(result, str):
        return result
    if isinstance(result, dict):
        return result.get("text", "")
    return str(result)


def run_pdf(path: Path, ocr) -> list[dict]:
    emit_progress("rendering", 0.05, "PDF をレンダリング中...")
    images = list(_pdf_pages_to_images(path))
    total = max(1, len(images))
    pages: list[dict] = []
    for i, img in enumerate(images):
        emit_progress("ocr", 0.1 + 0.85 * (i / total), f"ページ {i + 1}/{total}")
        result = ocr.recognize(img)
        pages.append({"page": i + 1, "text": _extract_text(result)})
    return pages


def run_image(path: Path, ocr) -> list[dict]:
    emit_progress("ocr", 0.3, "画像を認識中...")
    result = ocr.recognize(str(path))
    return [{"page": 1, "text": _extract_text(result)}]


def run_ocr(path: Path, lang: str) -> dict:
    emit_progress("loading", 0.0, "NDLOCR-Lite を読み込み中...")
    ocr = _load_ocr(lang)

    suffix = path.suffix.lower()
    if suffix == ".pdf":
        pages = run_pdf(path, ocr)
    elif suffix in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".tiff", ".tif", ".bmp"}:
        pages = run_image(path, ocr)
    else:
        raise RuntimeError(f"OCR 非対応の拡張子: {suffix}")

    emit_progress("done", 1.0, "完了")
    return {
        "text": "\n\n".join(p["text"] for p in pages if p["text"]),
        "pages": pages,
        "error": None,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="NDLOCR-Lite runner for CourtStrategies")
    parser.add_argument("input", nargs="?", help="OCR 対象ファイルのパス")
    parser.add_argument("--lang", default="jpn", help="OCR 言語 (既定: jpn)")
    parser.add_argument("--check", action="store_true", help="依存関係と準備状況のみ確認")
    args = parser.parse_args()

    if args.check:
        # バイナリの起動確認用: 依存を import して OK を返す
        try:
            import pypdfium2  # noqa: F401
            from ndlocr_lite import NDLOCR  # type: ignore  # noqa: F401
            emit_result({"ok": True, "model_dir": str(_bundled_model_dir() or "")})
            return 0
        except Exception as e:
            emit_result({"ok": False, "error": str(e)})
            return 1

    if not args.input:
        emit_result({"error": "input パスが指定されていません"})
        return 1

    path = Path(args.input)
    if not path.exists():
        emit_result({"error": f"ファイルが見つかりません: {path}"})
        return 1

    try:
        # GPU が使えない環境で torch が余計なスレッドを起動しないよう抑制
        os.environ.setdefault("OMP_NUM_THREADS", "2")
        result = run_ocr(path, args.lang)
        emit_result(result)
        return 0
    except Exception as e:
        emit_result({"error": str(e), "traceback": traceback.format_exc()})
        return 1


if __name__ == "__main__":
    sys.exit(main())
