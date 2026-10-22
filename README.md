# CMPE 491 Group 13: Project Website

Single-page static website (`index.html`) for our senior design project at TED University, published with GitHub Pages.

**Project:** Attention-Guided Manipulation-Aware Detection of AI-Generated and Edited Images for Improved Cross-Dataset Generalization

## Adding a report

1. Put the PDF in the `reports/` folder (e.g. `reports/D1-Project-Proposal.pdf`).
2. In `index.html`, replace `<span class="badge wait">Upcoming</span>` in the matching row with
   `<a href="reports/D1-Project-Proposal.pdf">PDF</a>`.
3. Commit and push. The site updates within a few minutes.

## Updating the backlog

The Backlog section of the site is generated from `backlog/backlog.js` (the current, living backlog). It is a plain data file: the comment at its top lists every field and the allowed values. No build step is needed, and the site also works when `index.html` is opened directly from disk.

**Add a task**: copy the template from the top of `backlog/backlog.js` into the `tasks: [ ... ]` list, give it the next free id and fill in the fields:

```js
{
  id: "T-014",
  title: "Prepare evaluation datasets",
  description: "Download and split the cross-dataset test sets.",
  sprint: "S2",
  epic: "E2",
  story: false,
  sprintReady: true,
  priority: "High",
  status: "Not Started",
  points: 5,
  owners: ["Tuna Can Tungul"],
  related: ["FR2", "D4"],
  acceptance: "Train/val/test splits are documented and reproducible.",
  startedOn: null,
  completedOn: null,
  links: [],
  notes: ""
},
```

**Change a status**: edit the task in place.

- Not Started → In Progress: set `status: "In Progress"` and `startedOn: "2026-11-02"`.
- In Progress → Complete: set `status: "Complete"` and `completedOn: "2026-11-09"`. A Complete task without `completedOn` shows up as a data warning on the site.

Also update `lastUpdated` at the top of the file, then commit and push:

```
git add backlog/backlog.js
git commit -m "Backlog: start T-014, complete T-009"
git push
```

Open the page and check the Backlog section. If the file has a syntax error (usually a missing comma or quote), the section says the data could not be loaded and the browser console (F12) shows the line. Problems in the data itself (unknown status, unknown sprint id, duplicate task id, ...) are listed in a small "data warnings" note above the backlog.

## Freezing a backlog version (D3/D5/D7)

Each backlog deliverable is a frozen copy of the current backlog: v1 = D3 (23.10.2026), v2 = D5 (20.11.2026), v3 = D7 (31.12.2026). On the due date, run:

```
python3 scripts/freeze_backlog.py v2
```

(`--date YYYY-MM-DD` sets the freeze date; `--force` overwrites an existing snapshot.) The script does the steps below; they can also be done by hand:

1. Copy `backlog/backlog.js` to `backlog/versions/v2.js`.
2. In the copy, change `window.BACKLOG_VERSIONS["current"]` to `window.BACKLOG_VERSIONS["v2"]`, and set `version: "v2"`, `label: "Backlog v2"`, `deliverable: "D5"`, `frozenOn: "2026-11-20"`.
3. In `index.html`, add `<script src="backlog/versions/v2.js"></script>` just above the `<!-- backlog-versions:end -->` comment at the bottom of the page.
4. In the Deliverables table, replace the D5 row's `<span class="badge wait">Upcoming</span>` with `<a href="#backlog?v=v2">Backlog v2</a>`.

Check the site (the v2 button in the Backlog section becomes active, and `#backlog?v=v2` opens it), then commit and push. Use "Print / Save as PDF" in the Backlog section to produce a PDF for the LMS. Do not edit a frozen file afterwards; keep working in `backlog/backlog.js`.

## Publishing

The repository must be public. On GitHub: Settings → Pages → Source: "Deploy from a branch", Branch: `main`, folder `/ (root)`.
