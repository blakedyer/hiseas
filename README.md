# HISEAS Static Site

Single-page static rebuild of `hiseas.org`, generated from YAML data files and Jinja templates.

## Production Target

Builds default to `http://carbonate.seos.uvic.ca:11100/hiseas`.
Do not set `HISEAS_BASE_PATH` for production builds unless the deployment target changes.
The default production base path is `/hiseas`.

## Local Development

```bash
python -m pip install -r requirements.txt
python scripts/build.py
python -m http.server 8000 -d dist
```

Open `http://localhost:8000`.

## Deployment under a subpath

If Apache serves the site from a path prefix (for example `/hiseas/`), build with:

```bash
HISEAS_BASE_PATH=/hiseas python scripts/build.py
```

Then deploy the generated `dist/` directory as before.

## Content Model

- `data/site.yml`: global metadata, navigation, footer links.
- `data/home.yml`: research homepage content.
- `data/field_cases.yml`: field atlas records, including the Cook Islands case.
- `data/media.yml`: curated cinematic media, video posters, placeholders, and outreach clip metadata.
- `data/publications.yml`: publication records.
- `data/team.yml`: people grouped by role.
- `data/outreach.yml`: outreach copy and events.

The generated site is currently `dist/index.html` plus static assets. Source content should be changed in `data/`, `templates/`, and `static/`.
