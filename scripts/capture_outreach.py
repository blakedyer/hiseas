from __future__ import annotations

import argparse
import os
import subprocess
import sys
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
OUTPUT = ROOT / "output" / "playwright"


def build_local_preview() -> None:
    env = os.environ.copy()
    env["HISEAS_BASE_PATH"] = ""
    subprocess.run([sys.executable, str(ROOT / "scripts" / "build.py")], cwd=ROOT, env=env, check=True)


def serve_dist() -> tuple[ThreadingHTTPServer, str]:
    handler = partial(SimpleHTTPRequestHandler, directory=str(DIST))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    return server, f"http://{host}:{port}/"


def capture_viewports(url: str, chrome_bin: str) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    viewports = {
        "desktop": (1440, 950),
        "tablet": (900, 900),
        "mobile": (390, 844),
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path=chrome_bin,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        for name, (width, height) in viewports.items():
            page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
            page.route("**/*.mp4", lambda route: route.abort())
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            page.add_style_tag(
                content="""
                  *, *::before, *::after {
                    animation-duration: 0.001ms !important;
                    scroll-behavior: auto !important;
                    transition-duration: 0.001ms !important;
                  }
                  [data-reveal],
                  [data-reveal-child],
                  [data-reveal-group] [data-reveal-child] {
                    filter: none !important;
                    opacity: 1 !important;
                    transform: none !important;
                  }
                """
            )
            page.wait_for_selector("#outreach", state="visible", timeout=15000)
            page.evaluate(
                """
                () => {
                  const section = document.querySelector("#outreach");
                  window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY);
                }
                """
            )
            page.wait_for_timeout(300)

            page.screenshot(path=str(OUTPUT / f"outreach-{name}-viewport.png"), full_page=False)
            page.locator("#outreach").screenshot(path=str(OUTPUT / f"outreach-{name}-section.png"))

            metrics = page.evaluate(
                """
                () => {
                  const section = document.querySelector("#outreach");
                  const sectionRect = section.getBoundingClientRect();
                  const activeSlides = [...document.querySelectorAll(".outreach-carousel__slide.is-active")];
                  const bad = [...section.querySelectorAll("*")].filter((el) => {
                    const rect = el.getBoundingClientRect();
                    return rect.width > window.innerWidth + 1 || rect.left < -1 || rect.right > window.innerWidth + 1;
                  }).map((el) => el.className || el.tagName).slice(0, 8);
                  return {
                    sectionHeight: Math.round(sectionRect.height),
                    activeSlides: activeSlides.length,
                    links: document.querySelectorAll("#outreach .coverage-links a").length,
                    videoSrc: document.querySelector("#outreach video source")?.getAttribute("src") || null,
                    overflow: bad,
                  };
                }
                """
            )
            print(f"{name}: {metrics}")
            page.close()
        browser.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Capture the HISEAS outreach section across viewports.")
    parser.add_argument("--skip-build", action="store_true", help="Use the existing dist directory.")
    parser.add_argument("--chrome-bin", default=os.environ.get("CHROME_BIN", "/opt/google/chrome/chrome"))
    args = parser.parse_args()

    if not args.skip_build:
        build_local_preview()
    if not Path(args.chrome_bin).exists():
        raise SystemExit(f"Chrome binary not found: {args.chrome_bin}")

    server, url = serve_dist()
    try:
        capture_viewports(f"{url}#outreach", args.chrome_bin)
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
