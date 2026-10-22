/*
 * Backlog section of the Group 13 project site.
 *
 * Reads window.BACKLOG_VERSIONS, which backlog/backlog.js ("current") and
 * backlog/versions/vN.js (frozen snapshots) fill in, and renders #backlog.
 * Plain browser JavaScript: no dependencies, no build step, works from file://.
 * All text coming from the data files is HTML-escaped before it is inserted.
 */
(() => {
  'use strict';

  const section = document.getElementById('backlog');
  if (!section) return;

  // Versions the course expects. A version becomes selectable once its file is loaded.
  const EXPECTED_VERSIONS = [
    { key: 'current', short: 'Current', sub: 'Living backlog' },
    { key: 'v1', short: 'v1', deliverable: 'D3', due: '2026-10-23' },
    { key: 'v2', short: 'v2', deliverable: 'D5', due: '2026-11-20' },
    { key: 'v3', short: 'v3', deliverable: 'D7', due: '2026-12-31' },
  ];
  const STATUSES = ['Not Started', 'In Progress', 'Complete', 'Blocked'];
  const STATUS_CLASS = { 'Not Started': 'wait', 'In Progress': 'prog', 'Complete': 'ok', 'Blocked': 'block' };
  const PRIORITIES = ['High', 'Medium', 'Low'];
  const PRIORITY_CLASS = { High: 'high', Medium: 'med', Low: 'low' };
  const POINTS = [1, 2, 3, 5, 8, 13];
  const NONE = '__none__';
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const PREFS_KEY = 'group13.backlog.prefs';
  const COLUMNS = [
    ['id', 'ID'], ['title', 'Task'], ['story', 'Story'], ['sprintReady', 'Sprint Ready'],
    ['priority', 'Priority'], ['status', 'Status'], ['points', 'Points'], ['owners', 'Owner(s)'], [null, 'Related'],
  ];

  const store = window.BACKLOG_VERSIONS || {};
  const cache = {};

  // ---------- small helpers ----------

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const fmtDate = (iso) => (iso && DATE_RE.test(iso) ? iso.split('-').reverse().join('.') : '');
  const today = () => new Date().toLocaleDateString('en-CA');
  const yesNo = (v) => (v ? 'Yes' : 'No');
  const sumPoints = (tasks) => tasks.reduce((n, t) => n + t.points, 0);
  const donePoints = (tasks) => sumPoints(tasks.filter((t) => t.status === 'Complete'));
  const percent = (done, total) => (total ? Math.round((done / total) * 100) : 0);
  const isLoaded = (key) => Boolean(store[key]) && typeof store[key] === 'object';

  // Relative links and http(s)/mailto only; anything else (javascript:, data:) is dropped.
  const safeHref = (href) => {
    const h = String(href ?? '').trim();
    if (!h) return '';
    return /^[a-z][a-z0-9+.-]*:/i.test(h) && !/^(https?|mailto):/i.test(h) ? '' : h;
  };

  const statusBadge = (s) => `<span class="badge ${STATUS_CLASS[s] || 'wait'}">${esc(s)}</span>`;
  const priorityBadge = (p) => `<span class="badge ${PRIORITY_CLASS[p] || 'med'}">${esc(p)}</span>`;
  const progressBar = (done, total, label) => {
    const pct = percent(done, total);
    return `<div class="bl-bar" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>`;
  };

  // ---------- preferences (optional; the page works without storage) ----------

  const readPrefs = () => {
    try {
      return JSON.parse(window.localStorage.getItem(PREFS_KEY)) || {};
    } catch (e) {
      return {};
    }
  };
  const writePrefs = () => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify({ view: state.view, collapsed: state.collapsed }));
    } catch (e) {
      // Storage blocked or unavailable: preferences are simply not remembered.
    }
  };

  // ---------- data validation ----------

  // Returns a cleaned copy of one version object plus a list of human-readable warnings.
  // Invalid values are replaced with safe defaults so the page never breaks.
  function normalize(key, raw) {
    const warnings = [];
    const warn = (msg) => warnings.push(msg);
    const v = raw && typeof raw === 'object' ? raw : {};
    const list = (value, name) => {
      if (value == null) return [];
      if (Array.isArray(value)) return value;
      warn(`"${name}" should be a list in square brackets [ ... ].`);
      return [];
    };
    const date = (value, where) => {
      if (value == null || value === '') return null;
      if (typeof value === 'string' && DATE_RE.test(value)) return value;
      warn(`${where}: date "${value}" is not in YYYY-MM-DD format.`);
      return null;
    };
    const uniqueIds = (items, kind) => {
      const seen = new Set();
      return items.filter((item, i) => {
        if (!item || typeof item !== 'object' || !item.id) {
          warn(`${kind} #${i + 1} has no id and is ignored.`);
          return false;
        }
        if (seen.has(item.id)) warn(`Duplicate ${kind.toLowerCase()} id "${item.id}".`);
        seen.add(item.id);
        return true;
      });
    };

    if (v.version != null && v.version !== key) {
      warn(`File registered as "${key}" but its version field says "${v.version}".`);
    }
    const meta = {
      label: v.label || (key === 'current' ? 'Current backlog' : `Backlog ${key}`),
      deliverable: v.deliverable || null,
      frozenOn: date(v.frozenOn, 'frozenOn'),
      lastUpdated: date(v.lastUpdated, 'lastUpdated'),
    };
    const team = list(v.team, 'team').map(String);
    const epics = uniqueIds(list(v.epics, 'epics'), 'Epic').map((e) => ({
      id: String(e.id), name: e.name || '', description: e.description || '',
    }));
    const sprints = uniqueIds(list(v.sprints, 'sprints'), 'Sprint').map((s) => ({
      id: String(s.id),
      name: s.name || String(s.id),
      start: date(s.start, `Sprint ${s.id} start`),
      end: date(s.end, `Sprint ${s.id} end`),
      goal: s.goal || '',
      deliverables: list(s.deliverables, `Sprint ${s.id} deliverables`).map(String),
    }));
    const epicIds = new Set(epics.map((e) => e.id));
    const sprintIds = new Set(sprints.map((s) => s.id));
    const teamSet = new Set(team);
    const seenTasks = new Set();

    const tasks = list(v.tasks, 'tasks').map((rawTask, i) => {
      const t = rawTask && typeof rawTask === 'object' ? rawTask : {};
      const id = t.id ? String(t.id) : `#${i + 1}`;
      const where = `Task ${id}`;
      if (!t.id) warn(`Task #${i + 1} has no id.`);
      else if (seenTasks.has(id)) warn(`Duplicate task id "${id}".`);
      seenTasks.add(id);
      if (!t.title) warn(`${where} has no title.`);

      let status = t.status;
      if (!STATUSES.includes(status)) {
        warn(`${where}: unknown status "${status ?? ''}" (allowed: ${STATUSES.join(', ')}). Shown as Not Started.`);
        status = 'Not Started';
      }
      let priority = t.priority;
      if (!PRIORITIES.includes(priority)) {
        warn(`${where}: unknown priority "${priority ?? ''}" (allowed: ${PRIORITIES.join(', ')}). Shown as Medium.`);
        priority = 'Medium';
      }
      let points = Number(t.points);
      if (!POINTS.includes(points)) {
        warn(`${where}: story points should be one of ${POINTS.join(', ')} (got "${t.points ?? ''}").`);
        if (!Number.isFinite(points) || points < 0) points = 0;
      }
      let sprint = t.sprint == null || t.sprint === '' ? null : String(t.sprint);
      if (sprint && !sprintIds.has(sprint)) {
        warn(`${where}: sprint "${sprint}" does not exist. Shown as unscheduled.`);
        sprint = null;
      }
      const epic = t.epic == null || t.epic === '' ? null : String(t.epic);
      if (epic && !epicIds.has(epic)) warn(`${where}: epic "${epic}" does not exist.`);
      ['story', 'sprintReady'].forEach((field) => {
        if (t[field] != null && typeof t[field] !== 'boolean') warn(`${where}: ${field} should be true or false.`);
      });
      const owners = list(t.owners, `${where} owners`).map(String);
      owners.filter((o) => team.length && !teamSet.has(o))
        .forEach((o) => warn(`${where}: owner "${o}" is not in the team list.`));
      const startedOn = date(t.startedOn, `${where} startedOn`);
      const completedOn = date(t.completedOn, `${where} completedOn`);
      if (status === 'Complete' && !completedOn) warn(`${where} is Complete but has no completedOn date.`);
      if (completedOn && status !== 'Complete') warn(`${where} has a completedOn date but its status is ${status}.`);

      return {
        uid: `bl-t${i}`,
        id,
        title: t.title ? String(t.title) : '',
        description: t.description || '',
        sprint,
        epic,
        story: t.story === true,
        sprintReady: t.sprintReady === true,
        priority,
        status,
        points,
        owners,
        related: list(t.related, `${where} related`).map(String),
        acceptance: t.acceptance || '',
        startedOn,
        completedOn,
        links: list(t.links, `${where} links`).filter((l) => l && l.href),
        notes: t.notes || '',
      };
    });

    return { key, meta, team, epics, sprints, tasks, warnings };
  }

  function getData(key) {
    if (!isLoaded(key)) return null;
    if (!cache[key]) {
      cache[key] = normalize(key, store[key]);
      cache[key].warnings.forEach((w) => console.warn(`[backlog ${key}] ${w}`));
    }
    return cache[key];
  }

  // ---------- state ----------

  const emptyFilters = () => ({ statuses: [], priority: '', owner: '', sprint: '', epic: '', q: '' });
  const prefs = readPrefs();
  const state = {
    versionKey: 'current',
    data: null,
    notice: '',
    view: prefs.view === 'board' ? 'board' : 'table',
    collapsed: prefs.collapsed && typeof prefs.collapsed === 'object' ? prefs.collapsed : {},
    filters: emptyFilters(),
    sort: { key: null, dir: 1 },
    open: new Set(),
    printing: false,
  };

  const filtersActive = () => {
    const f = state.filters;
    return Boolean(f.statuses.length || f.priority || f.owner || f.sprint || f.epic || f.q.trim());
  };

  function matches(t) {
    const f = state.filters;
    if (f.statuses.length && !f.statuses.includes(t.status)) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.owner && (f.owner === NONE ? t.owners.length > 0 : !t.owners.includes(f.owner))) return false;
    if (f.sprint && (t.sprint || NONE) !== f.sprint) return false;
    if (f.epic && t.epic !== f.epic) return false;
    const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length) {
      const haystack = [t.id, t.title, t.description, ...t.related].join(' ').toLowerCase();
      if (!words.every((w) => haystack.includes(w))) return false;
    }
    return true;
  }

  const filteredTasks = () => (state.data ? state.data.tasks.filter(matches) : []);

  const SORT_VALUE = {
    id: (t) => t.id,
    title: (t) => t.title.toLowerCase(),
    story: (t) => (t.story ? 0 : 1),
    sprintReady: (t) => (t.sprintReady ? 0 : 1),
    priority: (t) => PRIORITIES.indexOf(t.priority),
    status: (t) => STATUSES.indexOf(t.status),
    points: (t) => t.points,
    owners: (t) => t.owners.join(', ').toLowerCase(),
  };

  function sortTasks(tasks) {
    const { key, dir } = state.sort;
    if (!key) return tasks;
    const value = SORT_VALUE[key];
    return tasks
      .map((t, i) => [t, i])
      .sort(([a, i], [b, j]) => {
        const x = value(a);
        const y = value(b);
        const cmp = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'en', { numeric: true });
        return cmp * dir || i - j;
      })
      .map(([t]) => t);
  }

  // Sprint groups in data order, then unscheduled tasks. Empty groups are hidden while filtering.
  function groupTasks(tasks) {
    const groups = state.data.sprints.map((s) => ({ id: s.id, name: s.name, sprint: s, tasks: [] }));
    const byId = new Map(groups.map((g) => [g.id, g]));
    const unscheduled = { id: NONE, name: 'Unscheduled (product backlog)', sprint: null, tasks: [] };
    tasks.forEach((t) => (byId.get(t.sprint) || unscheduled).tasks.push(t));
    if (unscheduled.tasks.length) groups.push(unscheduled);
    groups.forEach((g) => { g.tasks = sortTasks(g.tasks); });
    return filtersActive() ? groups.filter((g) => g.tasks.length) : groups;
  }

  function groupStatus(tasks) {
    if (!tasks.length) return 'Not Started';
    if (tasks.every((t) => t.status === 'Complete')) return 'Complete';
    if (tasks.some((t) => t.status === 'In Progress' || t.status === 'Complete')) return 'In Progress';
    if (tasks.some((t) => t.status === 'Blocked')) return 'Blocked';
    return 'Not Started';
  }

  const sprintDates = (s) => (s && (s.start || s.end) ? `${fmtDate(s.start) || '?'} – ${fmtDate(s.end) || '?'}` : '');
  const collapseKey = (groupId) => `${state.versionKey}:${groupId}`;

  // ---------- rendering ----------

  function renderVersions() {
    const extra = Object.keys(store)
      .filter((k) => !EXPECTED_VERSIONS.some((v) => v.key === k))
      .map((k) => ({ key: k, short: k }));
    $('bl-versions').innerHTML = EXPECTED_VERSIONS.concat(extra).map((v) => {
      const loaded = isLoaded(v.key);
      const sub = v.sub || [v.deliverable, fmtDate(v.due)].filter(Boolean).join(' · ');
      return `<button type="button" class="bl-chip bl-version" data-version="${esc(v.key)}"
        aria-pressed="${v.key === state.versionKey}"${loaded ? '' : ' disabled'}>
        <span class="bl-version-name">${esc(v.short)}</span>
        <span class="bl-version-sub">${esc(sub)}${loaded ? '' : ' · upcoming'}</span></button>`;
    }).join('');
  }

  function renderMeta() {
    const d = state.data;
    if (!d) {
      $('bl-meta').textContent = 'No backlog data loaded.';
      $('bl-print-meta').textContent = '';
      return;
    }
    const m = d.meta;
    const parts = [state.versionKey === 'current'
      ? 'Viewing the current backlog'
      : `Viewing ${m.label}${m.deliverable ? `, submitted as ${m.deliverable}` : ''}`];
    if (m.frozenOn) parts.push(`frozen on ${fmtDate(m.frozenOn)}`);
    if (m.lastUpdated) parts.push(`Last updated: ${fmtDate(m.lastUpdated)}`);
    $('bl-meta').textContent = parts.join(' · ');
    $('bl-print-meta').textContent = [
      `${m.label}${m.deliverable ? ` (${m.deliverable})` : ''}`,
      m.lastUpdated ? `Last updated ${fmtDate(m.lastUpdated)}` : '',
      `Printed ${fmtDate(today())}`,
    ].filter(Boolean).join(' · ');
  }

  function renderNotices() {
    let html = '';
    if (state.notice) html += `<p class="bl-notice">${esc(state.notice)}</p>`;
    const warnings = state.data ? state.data.warnings : [];
    if (warnings.length) {
      html += `<details class="bl-warn"><summary>${warnings.length} data warning${warnings.length > 1 ? 's' : ''} in this backlog file</summary>
        <ul>${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></details>`;
    }
    $('bl-notices').innerHTML = html;
  }

  function setOptions(id, allLabel, options, value) {
    const select = $(id);
    select.innerHTML = `<option value="">${esc(allLabel)}</option>`
      + options.map(([v, label]) => `<option value="${esc(v)}">${esc(label)}</option>`).join('');
    select.value = options.some(([v]) => v === value) ? value : '';
  }

  function renderFilters() {
    const d = state.data || { team: [], sprints: [], epics: [], tasks: [] };
    const f = state.filters;
    const owners = [...new Set(d.team.concat(...d.tasks.map((t) => t.owners)))];
    const ownerOptions = owners.map((o) => [o, o]);
    if (d.tasks.some((t) => !t.owners.length)) ownerOptions.push([NONE, 'Unassigned']);
    const sprintOptions = d.sprints.map((s) => [s.id, s.name]);
    if (d.tasks.some((t) => !t.sprint)) sprintOptions.push([NONE, 'Unscheduled']);

    setOptions('bl-f-priority', 'All priorities', PRIORITIES.map((p) => [p, p]), f.priority);
    setOptions('bl-f-owner', 'All owners', ownerOptions, f.owner);
    setOptions('bl-f-sprint', 'All sprints', sprintOptions, f.sprint);
    setOptions('bl-f-epic', 'All epics', d.epics.map((e) => [e.id, e.name ? `${e.id} · ${e.name}` : e.id]), f.epic);
    $('bl-f-q').value = f.q;
    section.querySelectorAll('[data-status]').forEach((b) => {
      b.setAttribute('aria-pressed', String(f.statuses.includes(b.dataset.status)));
    });
  }

  function renderSummary(filtered) {
    const all = state.data ? state.data.tasks : [];
    const stat = (num, label) => `<div class="card bl-stat"><div class="bl-stat-num">${num}</div><div class="bl-stat-label">${label}</div></div>`;
    const total = sumPoints(filtered);
    const done = donePoints(filtered);
    const label = `${done} / ${total} story points complete`;
    $('bl-stats').innerHTML = stat(filtered.length, filtersActive() ? `Tasks shown (of ${all.length})` : 'Tasks')
      + ['Complete', 'In Progress', 'Not Started', 'Blocked']
        .map((s) => stat(filtered.filter((t) => t.status === s).length, statusBadge(s))).join('')
      + `<div class="card bl-stat bl-stat-progress">
          <div class="bl-stat-row"><span class="bl-stat-num">${percent(done, total)}%</span><span class="bl-stat-label">${esc(label)}</span></div>
          ${progressBar(done, total, label)}
        </div>`;
    $('bl-count').textContent = `${filtered.length} of ${all.length} task${all.length === 1 ? '' : 's'}`;
  }

  function renderSprints(filtered) {
    if (!state.data || (!state.data.sprints.length && !filtered.length)) {
      $('bl-sprints').innerHTML = '<p class="sub">No sprints defined yet.</p>';
      return;
    }
    const groups = groupTasks(filtered);
    if (!groups.length) {
      $('bl-sprints').innerHTML = '<p class="sub">No sprints match the current filters.</p>';
      return;
    }
    $('bl-sprints').innerHTML = groups.map((g) => {
      const total = sumPoints(g.tasks);
      const done = donePoints(g.tasks);
      const info = [sprintDates(g.sprint), g.sprint && g.sprint.deliverables.length ? `Deliverables: ${g.sprint.deliverables.join(', ')}` : '']
        .filter(Boolean).join(' · ');
      return `<div class="card bl-sprint">
        <div class="bl-sprint-head"><span class="bl-sprint-name">${esc(g.name)}</span>${statusBadge(groupStatus(g.tasks))}</div>
        ${info ? `<div class="bl-sprint-info">${esc(info)}</div>` : ''}
        ${g.sprint && g.sprint.goal ? `<p class="bl-sprint-goal">${esc(g.sprint.goal)}</p>` : ''}
        ${progressBar(done, total, `${g.name}: ${done} of ${total} story points complete`)}
        <div class="bl-sprint-info">${done} / ${total} story points complete · ${g.tasks.length} task${g.tasks.length === 1 ? '' : 's'}</div>
      </div>`;
    }).join('');
  }

  function detailHTML(t) {
    const d = state.data;
    const epic = d.epics.find((e) => e.id === t.epic);
    const sprint = d.sprints.find((s) => s.id === t.sprint);
    const links = t.links.map((l) => {
      const href = safeHref(l.href);
      const label = esc(l.label || l.href);
      if (!href) return label;
      return href.startsWith('#')
        ? `<a href="${esc(href)}">${label}</a>`
        : `<a href="${esc(href)}" target="_blank" rel="noopener">${label}</a>`;
    });
    const row = (label, value, wide) => (value
      ? `<div${wide ? ' class="bl-wide"' : ''}><dt>${label}</dt><dd>${value}</dd></div>` : '');
    return `<dl class="bl-dl">
      ${row('Description', esc(t.description), true)}
      ${row('Acceptance criteria', esc(t.acceptance), true)}
      ${row('Sprint', sprint ? esc(`${sprint.name}${sprintDates(sprint) ? ` (${sprintDates(sprint)})` : ''}`) : 'Unscheduled')}
      ${row('Epic', epic ? esc(`${epic.id} · ${epic.name}`) : esc(t.epic))}
      ${row('Started', fmtDate(t.startedOn) || 'Not yet')}
      ${row('Completed', fmtDate(t.completedOn) || 'Not yet')}
      ${row('Owner(s)', esc(t.owners.join(', ')) || 'Unassigned')}
      ${row('Related', esc(t.related.join(', ')))}
      ${row('Links', links.join(' · '), true)}
      ${row('Notes', esc(t.notes), true)}
    </dl>`;
  }

  function tableHTML(groups) {
    const head = COLUMNS.map(([key, label]) => {
      if (!key) return `<th scope="col">${label}</th>`;
      const active = state.sort.key === key;
      const ariaSort = active ? (state.sort.dir === 1 ? 'ascending' : 'descending') : 'none';
      const arrow = active ? (state.sort.dir === 1 ? '▲' : '▼') : '';
      // Chrome does not paint buttons in table headers repeated on printed pages, so the
      // label is also given as plain text that only the print stylesheet shows.
      return `<th scope="col" aria-sort="${ariaSort}"><button type="button" class="bl-sort" data-sort="${key}">${label}<span class="bl-sort-ind" aria-hidden="true">${arrow}</span></button><span class="bl-print-label" aria-hidden="true">${label}</span></th>`;
    }).join('');

    const bodies = groups.map((g, gi) => {
      const collapsed = !state.printing && Boolean(state.collapsed[collapseKey(g.id)]);
      const bodyId = `bl-g${gi}`;
      const rows = g.tasks.map((t) => {
        const open = state.open.has(t.uid);
        return `<tr class="bl-task${open ? ' is-open' : ''}" data-uid="${t.uid}">
          <td class="id">${esc(t.id)}</td>
          <td class="bl-title"><button type="button" class="bl-task-toggle" data-uid="${t.uid}" aria-expanded="${open}" aria-controls="${t.uid}-d">${esc(t.title || '(untitled)')}</button></td>
          <td>${yesNo(t.story)}</td>
          <td>${yesNo(t.sprintReady)}</td>
          <td>${priorityBadge(t.priority)}</td>
          <td>${statusBadge(t.status)}</td>
          <td class="bl-num">${t.points}</td>
          <td class="bl-small">${t.owners.length ? t.owners.map(esc).join('<br>') : '<span class="bl-none">Unassigned</span>'}</td>
          <td class="bl-small">${esc(t.related.join(', '))}</td>
        </tr>
        <tr class="bl-detail" id="${t.uid}-d"${open ? '' : ' hidden'}><td colspan="${COLUMNS.length}">${detailHTML(t)}</td></tr>`;
      }).join('') || `<tr><td colspan="${COLUMNS.length}" class="bl-empty">No tasks in this sprint yet.</td></tr>`;
      const total = sumPoints(g.tasks);
      return `<tbody id="${bodyId}" class="${collapsed ? 'is-collapsed' : ''}">
        <tr class="bl-group"><th scope="rowgroup" colspan="${COLUMNS.length}"><div class="bl-group-head">
          <button type="button" class="bl-group-toggle" data-group="${esc(g.id)}" aria-expanded="${!collapsed}" aria-controls="${bodyId}"><span class="bl-caret" aria-hidden="true"></span>${esc(g.name)}</button>
          <span class="bl-group-meta">${esc(sprintDates(g.sprint))}</span>
          <span class="bl-group-pts">${total} pts</span>
          ${statusBadge(groupStatus(g.tasks))}
        </div></th></tr>
        ${rows}
      </tbody>`;
    }).join('');

    const empty = groups.length ? ''
      : `<tbody><tr><td colspan="${COLUMNS.length}" class="bl-empty">No tasks match the current filters.</td></tr></tbody>`;
    return `<div class="table-wrap"><table class="bl-table">
      <caption class="bl-visually-hidden">Backlog tasks grouped by sprint</caption>
      <thead><tr>${head}</tr></thead>${bodies}${empty}</table></div>`;
  }

  function boardHTML(tasks) {
    const sprintName = (id) => (state.data.sprints.find((s) => s.id === id) || { name: 'Unscheduled' }).name;
    return `<div class="bl-board">${STATUSES.map((status) => {
      const cards = sortTasks(tasks.filter((t) => t.status === status)).map((t) => {
        const open = state.open.has(t.uid);
        const meta = [`${t.points} pts`, sprintName(t.sprint), t.owners.join(', ') || 'Unassigned'];
        return `<li class="card bl-kcard${open ? ' is-open' : ''}" data-uid="${t.uid}">
          <div class="bl-kcard-top"><span>${esc(t.id)}</span>${priorityBadge(t.priority)}</div>
          <button type="button" class="bl-task-toggle bl-kcard-title" data-uid="${t.uid}" aria-expanded="${open}" aria-controls="${t.uid}-d">${esc(t.title || '(untitled)')}</button>
          <div class="bl-kcard-meta">${meta.map(esc).join(' · ')}</div>
          <div class="bl-kcard-detail" id="${t.uid}-d"${open ? '' : ' hidden'}>${detailHTML(t)}</div>
        </li>`;
      }).join('');
      return `<div class="bl-col" role="region" aria-label="${status}">
        <div class="bl-col-head">${statusBadge(status)}<span>${tasks.filter((t) => t.status === status).length}</span></div>
        <ul>${cards || '<li class="bl-col-empty">No tasks</li>'}</ul>
      </div>`;
    }).join('')}</div>`;
  }

  function renderView(filtered = filteredTasks()) {
    section.querySelectorAll('[data-view]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.view === state.view));
    });
    const host = $('bl-view');
    if (!state.data) {
      host.innerHTML = '<p class="card bl-empty">Backlog data could not be loaded. Check that backlog/backlog.js exists and has no syntax errors (browser console, F12).</p>';
      return;
    }
    if (!state.data.tasks.length) {
      host.innerHTML = '<p class="card bl-empty">No tasks in this version yet.</p>';
      return;
    }
    const view = state.printing ? 'table' : state.view;
    host.innerHTML = view === 'board' ? boardHTML(filtered) : tableHTML(groupTasks(filtered));
  }

  function renderResults() {
    const filtered = filteredTasks();
    renderSummary(filtered);
    renderSprints(filtered);
    renderView(filtered);
  }

  function renderAll() {
    renderVersions();
    renderMeta();
    renderNotices();
    renderFilters();
    renderResults();
  }

  // ---------- actions ----------

  function setVersion(key) {
    state.notice = '';
    if (!isLoaded(key) && key !== 'current') {
      const expected = EXPECTED_VERSIONS.find((v) => v.key === key);
      state.notice = expected
        ? `Backlog ${key} (${expected.deliverable}) is not published yet. Showing the current backlog.`
        : `There is no backlog version "${key}". Showing the current backlog.`;
      key = 'current';
    }
    state.versionKey = key;
    state.data = getData(key);
    state.filters = emptyFilters();
    state.open.clear();
    renderAll();
  }

  function parseHash() {
    const match = /^#backlog(?:\?(.*))?$/.exec(window.location.hash);
    if (!match) return null;
    return { version: new URLSearchParams(match[1] || '').get('v') };
  }

  function writeHash(key, push) {
    const hash = key === 'current' ? '#backlog' : `#backlog?v=${encodeURIComponent(key)}`;
    if (window.location.hash === hash) return;
    try {
      window.history[push ? 'pushState' : 'replaceState'](null, '', hash);
    } catch (e) {
      // Some file:// setups refuse history changes; the deep link is then just not reflected.
    }
  }

  function toggleTask(uid) {
    const open = !state.open.has(uid);
    if (open) state.open.add(uid);
    else state.open.delete(uid);
    const panel = $(`${uid}-d`);
    if (panel) panel.hidden = !open;
    section.querySelectorAll(`[aria-controls="${uid}-d"]`).forEach((b) => b.setAttribute('aria-expanded', String(open)));
    section.querySelectorAll(`[data-uid="${uid}"].bl-task, [data-uid="${uid}"].bl-kcard`)
      .forEach((el) => el.classList.toggle('is-open', open));
  }

  function toggleGroup(button) {
    const key = collapseKey(button.dataset.group);
    const collapsed = !state.collapsed[key];
    if (collapsed) state.collapsed[key] = true;
    else delete state.collapsed[key];
    button.setAttribute('aria-expanded', String(!collapsed));
    $(button.getAttribute('aria-controls')).classList.toggle('is-collapsed', collapsed);
    writePrefs();
  }

  function toggleSort(key) {
    const s = state.sort;
    if (s.key !== key) Object.assign(s, { key, dir: 1 });
    else if (s.dir === 1) s.dir = -1;
    else Object.assign(s, { key: null, dir: 1 });
    renderView();
    const button = $('bl-view').querySelector(`[data-sort="${key}"]`);
    if (button) button.focus();
  }

  // Exported rows follow the table: sprint order, then the current sort; filters applied.
  function exportCSV() {
    if (!state.data) return;
    const sprintName = (id) => (state.data.sprints.find((s) => s.id === id) || { name: '' }).name;
    const header = ['ID', 'Task', 'Description', 'Story', 'Sprint Ready', 'Priority', 'Status', 'Story Points',
      'Assigned to Sprint', 'Epic', 'Owners', 'Related', 'Acceptance Criteria', 'Started On', 'Completed On', 'Notes'];
    const rows = groupTasks(filteredTasks()).flatMap((g) => g.tasks).map((t) => [
      t.id, t.title, t.description, yesNo(t.story), yesNo(t.sprintReady), t.priority, t.status, t.points,
      sprintName(t.sprint), t.epic || '', t.owners.join('; '), t.related.join('; '), t.acceptance,
      t.startedOn || '', t.completedOn || '', t.notes,
    ]);
    // Quote every cell; prefix cells that spreadsheets would treat as formulas.
    const cell = (value) => {
      let s = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = `﻿${[header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `group13-backlog-${state.versionKey}-${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- events ----------

  $('bl-versions').addEventListener('click', (e) => {
    const button = e.target.closest('[data-version]');
    if (!button || button.disabled) return;
    setVersion(button.dataset.version);
    writeHash(state.versionKey, false);
  });

  section.querySelectorAll('[data-status]').forEach((button) => {
    button.addEventListener('click', () => {
      const f = state.filters;
      const s = button.dataset.status;
      f.statuses = f.statuses.includes(s) ? f.statuses.filter((x) => x !== s) : f.statuses.concat(s);
      button.setAttribute('aria-pressed', String(f.statuses.includes(s)));
      renderResults();
    });
  });

  [['bl-f-priority', 'priority'], ['bl-f-owner', 'owner'], ['bl-f-sprint', 'sprint'], ['bl-f-epic', 'epic']]
    .forEach(([id, field]) => {
      $(id).addEventListener('change', (e) => {
        state.filters[field] = e.target.value;
        renderResults();
      });
    });

  $('bl-f-q').addEventListener('input', (e) => {
    state.filters.q = e.target.value;
    renderResults();
  });

  $('bl-clear').addEventListener('click', () => {
    state.filters = emptyFilters();
    renderFilters();
    renderResults();
  });

  section.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      writePrefs();
      renderView();
    });
  });

  $('bl-csv').addEventListener('click', exportCSV);

  // The button prints only the backlog; Ctrl+P prints the whole site. Both force the table view.
  $('bl-print').addEventListener('click', () => {
    document.documentElement.classList.add('bl-print-backlog');
    window.print();
  });
  window.addEventListener('beforeprint', () => {
    state.printing = true;
    renderMeta();
    renderView();
  });
  window.addEventListener('afterprint', () => {
    state.printing = false;
    document.documentElement.classList.remove('bl-print-backlog');
    renderView();
  });

  $('bl-view').addEventListener('click', (e) => {
    const sortButton = e.target.closest('[data-sort]');
    if (sortButton) return toggleSort(sortButton.dataset.sort);
    const groupButton = e.target.closest('[data-group]');
    if (groupButton) return toggleGroup(groupButton);
    const taskButton = e.target.closest('.bl-task-toggle');
    if (taskButton) return toggleTask(taskButton.dataset.uid);
    // Clicking elsewhere on a row or card also opens it, unless the click is on a link,
    // inside the open details, or the user is selecting text.
    if (e.target.closest('a, button, .bl-dl') || String(window.getSelection())) return;
    const item = e.target.closest('.bl-task, .bl-kcard');
    if (item) toggleTask(item.dataset.uid);
  });

  // Links such as the Deliverables table's "#backlog?v=v1" select a version and scroll here.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#backlog?"]');
    if (!link) return;
    const match = /[?&]v=([^&]+)/.exec(link.getAttribute('href'));
    if (!match) return;
    e.preventDefault();
    setVersion(decodeURIComponent(match[1]));
    writeHash(state.versionKey, true);
    section.scrollIntoView();
  });

  window.addEventListener('hashchange', () => {
    const parsed = parseHash();
    if (!parsed || !parsed.version) return;
    if (parsed.version !== state.versionKey) setVersion(parsed.version);
    section.scrollIntoView();
  });

  // ---------- start ----------

  const initial = parseHash();
  setVersion((initial && initial.version) || 'current');
  if (initial && initial.version) {
    // "#backlog?v=..." is not an element id, so the browser does not scroll by itself.
    // Wait for fonts and layout, and jump without the page's smooth scrolling.
    const jump = () => section.scrollIntoView({ behavior: 'instant' });
    if (document.readyState === 'complete') jump();
    else window.addEventListener('load', jump, { once: true });
  }
})();
