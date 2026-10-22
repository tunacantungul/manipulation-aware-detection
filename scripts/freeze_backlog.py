#!/usr/bin/env python3
"""Freeze the current backlog as a numbered version for submission.

    python3 scripts/freeze_backlog.py v2               # frozen today
    python3 scripts/freeze_backlog.py v2 --date 2026-11-20
    python3 scripts/freeze_backlog.py v1 --force       # overwrite an existing snapshot

What it does:
  1. Copies backlog/backlog.js to backlog/versions/vN.js, registering it as
     BACKLOG_VERSIONS["vN"] with version, label, deliverable and frozenOn set.
  2. Adds <script src="backlog/versions/vN.js"> to index.html (before the
     "backlog-versions:end" marker), so the version becomes selectable.
  3. Replaces the "Upcoming" badge in the matching Deliverables row with a link
     to #backlog?v=vN.

The site does not need this script: the same steps can be done by hand
(see "Freezing a backlog version" in README.md). Standard library only.
"""
import argparse
import datetime
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "backlog" / "backlog.js"
VERSIONS_DIR = ROOT / "backlog" / "versions"
INDEX = ROOT / "index.html"
END_MARKER = "<!-- backlog-versions:end -->"
DELIVERABLES = {"v1": "D3", "v2": "D5", "v3": "D7"}


def fail(message):
    sys.exit(f"error: {message}")


def set_field(text, name, value):
    """Replace the first top-level `name: <value>,` line in the data file."""
    pattern = re.compile(rf'^(\s*{name}\s*:\s*)(null|"[^"\n]*"|\'[^\'\n]*\')', re.MULTILINE)
    text, count = pattern.subn(lambda m: m.group(1) + value, text, count=1)
    if count != 1:
        fail(f'could not find the "{name}:" field in {SOURCE.relative_to(ROOT)}')
    return text


def freeze_data(version, deliverable, date):
    text = SOURCE.read_text(encoding="utf-8")
    text, count = re.subn(
        r'window\.BACKLOG_VERSIONS\[\s*["\']current["\']\s*\]',
        f'window.BACKLOG_VERSIONS["{version}"]',
        text,
    )
    if count != 1:
        fail('backlog/backlog.js must register exactly one window.BACKLOG_VERSIONS["current"]')
    text = set_field(text, "version", f'"{version}"')
    text = set_field(text, "label", f'"Backlog {version}"')
    text = set_field(text, "deliverable", f'"{deliverable}"')
    text = set_field(text, "frozenOn", f'"{date}"')
    banner = (
        f"// FROZEN SNAPSHOT: Backlog {version}, submitted as {deliverable}, frozen on {date}.\n"
        "// Do not edit. Make changes in backlog/backlog.js instead.\n"
    )
    return banner + text


def update_index(version, deliverable):
    html = INDEX.read_text(encoding="utf-8")
    tag = f'<script src="backlog/versions/{version}.js"></script>'
    if tag not in html:
        marker = re.search(rf"^([ \t]*){re.escape(END_MARKER)}", html, re.MULTILINE)
        if not marker:
            fail(f"marker {END_MARKER} not found in index.html")
        indent = marker.group(1)
        html = html[: marker.start()] + f"{indent}{tag}\n" + html[marker.start():]

    row = re.compile(
        rf'(<tr><td class="id">{deliverable}</td>.*?<td>)<span class="badge wait">Upcoming</span>(</td></tr>)'
    )
    html, count = row.subn(rf'\g<1><a href="#backlog?v={version}">Backlog {version}</a>\g<2>', html, count=1)
    if count == 0 and f'href="#backlog?v={version}"' not in html:
        print(f"warning: could not update the {deliverable} row in the Deliverables table; edit it by hand")
    INDEX.write_text(html, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Freeze backlog/backlog.js as backlog/versions/vN.js")
    parser.add_argument("version", choices=sorted(DELIVERABLES), help="version to create")
    parser.add_argument("--date", default=datetime.date.today().isoformat(), help="freeze date, YYYY-MM-DD (default: today)")
    parser.add_argument("--force", action="store_true", help="overwrite an existing snapshot")
    args = parser.parse_args()

    try:
        datetime.date.fromisoformat(args.date)
    except ValueError:
        fail(f"--date must be YYYY-MM-DD, got {args.date!r}")

    target = VERSIONS_DIR / f"{args.version}.js"
    if target.exists() and not args.force:
        fail(f"{target.relative_to(ROOT)} already exists (use --force to overwrite)")

    deliverable = DELIVERABLES[args.version]
    VERSIONS_DIR.mkdir(parents=True, exist_ok=True)
    target.write_text(freeze_data(args.version, deliverable, args.date), encoding="utf-8")
    update_index(args.version, deliverable)

    print(f"Created {target.relative_to(ROOT)} (Backlog {args.version}, {deliverable}, frozen {args.date}).")
    print("Open index.html, check the Backlog section, then commit and push:")
    print(f'  git add backlog index.html && git commit -m "Freeze backlog {args.version} ({deliverable})"')


if __name__ == "__main__":
    main()
