from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Any

import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
TEMPLATE_DIR = ROOT / "templates"
STATIC_DIR = ROOT / "static"
OUT_DIR = ROOT / "dist"
# Default production target is http://carbonate.seos.uvic.ca:11100/hiseas.
# Set HISEAS_BASE_PATH explicitly only when the deployment target changes.
BASE_PATH = os.getenv("HISEAS_BASE_PATH", "/hiseas").strip()
if BASE_PATH and not BASE_PATH.startswith("/"):
    BASE_PATH = f"/{BASE_PATH}"
BASE_PATH = BASE_PATH.rstrip("/")


def with_base_path(value: str) -> str:
    if not isinstance(value, str):
        return value
    if value.startswith("//"):
        return value
    if not value.startswith("/"):
        return value
    if BASE_PATH and (value == BASE_PATH or value.startswith(f"{BASE_PATH}/") or value.startswith(f"{BASE_PATH}#")):
        return value
    if BASE_PATH:
        return f"{BASE_PATH}{value}"
    return value


def with_image_url(value: str) -> str:
    if not isinstance(value, str):
        return value
    if value.startswith("http://") or value.startswith("https://") or value.startswith("//"):
        return value
    return with_base_path(value)


def prefix_paths(node: Any) -> Any:
    if isinstance(node, str):
        return with_base_path(node)
    if isinstance(node, list):
        return [prefix_paths(item) for item in node]
    if isinstance(node, dict):
        return {key: prefix_paths(value) for key, value in node.items()}
    return node


def load_yaml(name: str) -> dict[str, Any]:
    with (DATA_DIR / name).open(encoding="utf-8") as handle:
        return prefix_paths(yaml.safe_load(handle) or {})


def render_page(env: Environment, template: str, site: dict[str, Any], page: dict[str, Any], **context: Any) -> None:
    target = OUT_DIR / "index.html"
    html = env.get_template(template).render(site=site, page=page, **context)
    target.write_text(html, encoding="utf-8")


def copy_static() -> None:
    if STATIC_DIR.exists():
        shutil.copytree(STATIC_DIR, OUT_DIR, dirs_exist_ok=True)


def main() -> None:
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)
    copy_static()

    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        autoescape=select_autoescape(("html", "xml")),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["with_base_path"] = with_base_path
    env.filters["image_url"] = with_image_url

    site = load_yaml("site.yml")
    media = load_yaml("media.yml")
    home = load_yaml("home.yml")
    publications = load_yaml("publications.yml")
    team = load_yaml("team.yml")
    field_sites = load_yaml("field_cases.yml")
    outreach = load_yaml("outreach.yml")
    env.globals["media"] = media
    env.globals["base_path"] = BASE_PATH

    render_page(
        env,
        "home.html",
        site,
        home,
        field_sites=field_sites,
        publications=publications,
        team=team,
        outreach=outreach,
    )


if __name__ == "__main__":
    main()
