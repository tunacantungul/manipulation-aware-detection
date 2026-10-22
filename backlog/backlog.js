/*
 * ============================================================================
 *  Group 13 backlog: CURRENT (living) version
 * ============================================================================
 *  This file is the single source of truth for the "Current" backlog shown in
 *  the Backlog section of the website. Edit it, commit, push. No build step.
 *
 *  Frozen versions (v1 = D3, v2 = D5, v3 = D7) live in backlog/versions/ and
 *  are copies of this file, made with:   python3 scripts/freeze_backlog.py vN
 *  Do not edit a frozen version after it has been submitted.
 *
 *  HOW TO EDIT (no programming needed)
 *  - Text goes between double quotes: "like this". For a quote inside text write \"
 *  - Items in a list are separated by commas. A missing comma breaks the file:
 *    if the backlog disappears from the site, open the browser console (F12).
 *  - Dates are written "YYYY-MM-DD", e.g. "2026-10-23".
 *  - true, false and null are written WITHOUT quotes. null means "none / not yet".
 *
 *  TOP-LEVEL FIELDS
 *    version      "current" in this file; "v1", "v2", "v3" in frozen copies
 *    label        Name shown on the site: "Current backlog", "Backlog v1", ...
 *    deliverable  Deliverable the version is submitted as: "D3", "D5", "D7"; null here
 *    frozenOn     Date the version was frozen; null here
 *    lastUpdated  Date of the last edit. UPDATE IT whenever you change something.
 *    team         Team member names. Task owners must be written exactly like these.
 *    epics        Large themes that group tasks:
 *                   { id: "E1", name: "...", description: "..." }
 *    sprints      Time boxes, in order:
 *                   { id: "S1", name: "Sprint 1", start: "YYYY-MM-DD", end: "YYYY-MM-DD",
 *                     goal: "...", deliverables: ["D1", "D2", "D3"] }
 *    tasks        The backlog items, fields below.
 *
 *  TASK FIELDS                                      (syllabus column in brackets)
 *    id           Unique and never reused: "T-001", "T-002", ...
 *    title        Short name of the task                          [Task Name]
 *    description  What has to be done
 *    sprint       Sprint id such as "S1"; null = not scheduled yet [Assigned to Sprint]
 *    epic         Epic id such as "E1"; null if none
 *    story        true = user story, false = technical task       [Story]
 *    sprintReady  true = clear enough to start in a sprint        [Sprint Ready]
 *    priority     "High" | "Medium" | "Low"                       [Priority]
 *    status       "Not Started" | "In Progress" | "Complete" | "Blocked"   [Status]
 *    points       Story points: 1, 2, 3, 5, 8 or 13               [Story Points]
 *    owners       Names from team, e.g. ["Nilsu Dila Cabbar"]; [] if unassigned
 *    related      Requirement / deliverable ids, e.g. ["FR1", "NFR3", "D2"]; [] if none
 *    acceptance   How we know the task is done
 *    startedOn    Date work started, or null
 *    completedOn  Date it was finished, or null. Required when status is "Complete".
 *    links        [{ label: "D2 PDF", href: "reports/D2_Project_Specifications.pdf" }]; [] if none
 *    notes        Anything else; "" if none
 *
 *  Changing status:  "Not Started"  ->  "In Progress" (set startedOn)
 *                                   ->  "Complete"    (set completedOn)
 *
 *  When the page loads it checks this file and lists problems (unknown status,
 *  unknown sprint, duplicate id, Complete without completedOn, ...) in a small
 *  "data warnings" note in the Backlog section. The rest of the page still works.
 *
 *  Template for a new task (copy it into the tasks list below):
 *
 *    {
 *      id: "T-001",
 *      title: "",
 *      description: "",
 *      sprint: "S1",
 *      epic: "E1",
 *      story: false,
 *      sprintReady: true,
 *      priority: "Medium",
 *      status: "Not Started",
 *      points: 3,
 *      owners: [],
 *      related: [],
 *      acceptance: "",
 *      startedOn: null,
 *      completedOn: null,
 *      links: [],
 *      notes: ""
 *    },
 * ============================================================================
 */
window.BACKLOG_VERSIONS = window.BACKLOG_VERSIONS || {};
window.BACKLOG_VERSIONS["current"] = {
  version: "current",
  label: "Current backlog",
  deliverable: null,
  frozenOn: null,
  lastUpdated: "2026-10-23",
  team: ["Ali Efe Altun", "Nilsu Dila Cabbar", "Tuna Can Tungul"],

  epics: [
  ],

  sprints: [
  ],

  tasks: [
  ]
};
