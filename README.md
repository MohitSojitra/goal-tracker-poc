# GoalDocs

Two fill-in-the-blank goal sheets that print to A4 PDF, matching the GDS templates.

## Files

| File | What it is |
|---|---|
| `index.html` | The page — open this in Chrome |
| `style.css` | All styling, including the print/PDF rules |
| `app.js` | Editing, autosave, PDF export |
| `GoalDocs-standalone.html` | Same tool in one single file (no CSS/JS needed beside it) — handy for emailing or dropping on a USB stick |

Keep `index.html`, `style.css` and `app.js` together in the same folder.

## How to use

1. Open `index.html` (double-click, or drag into Chrome).
2. Pick a template at the top: **Goal Sheet** or **Action Plan**.
3. Type either in the left panel *or* straight onto the sheet — both stay in sync.
4. Click **Export PDF** → in the print dialog choose *Save as PDF*, **A4**, margins **None**, and turn **Headings/footers off**.

## Good to know

- **Autosave** — everything is kept in the browser, so closing the tab does not lose your work. It saves per browser, not per file.
- **Action blocks** — add or remove the bordered boxes on the goal sheet with *+ Add action block* / the ×.
- **Rows** — set any row count (1–60), add or delete individual rows, or hit *Fill "1 TO 1"* to populate every empty task.
- **Backup / Import** — writes a `goaldocs-backup.json` you can re-import later or on another machine.
- **Reset** — restores the currently open template to the blank original.
- **Zoom** — screen-only; it never affects the PDF, which is always true A4.
- **⌘/Ctrl + P** also triggers the export.

The Action Plan will flow onto a second page if you add more rows than fit; the Goal Sheet is always one page.
