/* ============================================================
   StudyBuddy – script.js
   All app logic: tasks, streak, progress, UI interactions
   ============================================================ */

/* ──────────────────────────────────────────────
   STATE
────────────────────────────────────────────── */
let tasks      = JSON.parse(localStorage.getItem('sb2_tasks') || '[]');
let streak     = parseInt(localStorage.getItem('sb2_streak')  || '0');
let lastStudy  = localStorage.getItem('sb2_last') || '';
let studyDays  = JSON.parse(localStorage.getItem('sb2_days')  || '[]');

let curFilter  = 'all';     // active task filter
let selSub     = 'Maths';   // selected subject chip
let selPrio    = 'urgent';  // selected priority button
let curTab     = 'home';    // active tab name

/* ──────────────────────────────────────────────
   PERSISTENCE
────────────────────────────────────────────── */
function save() {
  localStorage.setItem('sb2_tasks',  JSON.stringify(tasks));
  localStorage.setItem('sb2_streak', streak);
  localStorage.setItem('sb2_last',   lastStudy);
  localStorage.setItem('sb2_days',   JSON.stringify(studyDays));
}

/* ──────────────────────────────────────────────
   DATE HELPERS
────────────────────────────────────────────── */
/** Returns today's date as YYYY-MM-DD string */
function today() {
  return new Date().toISOString().split('T')[0];
}

/** Returns the date n days from today as YYYY-MM-DD */
function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/* ──────────────────────────────────────────────
   SEED DATA  (first-run demo tasks)
────────────────────────────────────────────── */
function seed() {
  if (tasks.length) return; // already has data

  tasks = [
    { id: 1, name: 'Finish Maths homework – Chapter 4',  subject: 'Maths',   priority: 'urgent', due: addDays(1), done: false, ts: Date.now() - 1000 },
    { id: 2, name: 'Read Science chapter on Plants',     subject: 'Science', priority: 'high',   due: addDays(3), done: false, ts: Date.now() - 2000 },
    { id: 3, name: 'Write an English essay',             subject: 'English', priority: 'medium', due: addDays(7), done: false, ts: Date.now() - 3000 },
    { id: 4, name: 'Draw a map for History project',     subject: 'History', priority: 'low',    due: addDays(6), done: false, ts: Date.now() - 4000 },
    { id: 5, name: 'Learn multiplication tables',        subject: 'Maths',   priority: 'medium', due: addDays(2), done: true,  ts: Date.now() - 5000 },
  ];

  streak     = 3;
  studyDays  = [addDays(-2), addDays(-1), today()];
  lastStudy  = today();
  save();
}

/* ──────────────────────────────────────────────
   NAVIGATION
────────────────────────────────────────────── */
function goTab(name) {
  curTab = name;

  // Hide all sections, remove active from all nav tabs
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));

  // Show selected section and highlight its nav tab
  document.getElementById('tab-'  + name).classList.add('active');
  document.getElementById('ntab-' + name).classList.add('active');

  // Tab-specific renders
  if (name === 'progress') renderProgress();
  if (name === 'streak')   renderStreak();

  renderAll();
}

/* ──────────────────────────────────────────────
   SUBJECT CHIPS  (tap to select)
────────────────────────────────────────────── */
document.getElementById('q-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#q-chips .chip').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');
  selSub = chip.dataset.s;
});

/* ──────────────────────────────────────────────
   PRIORITY BUTTONS  (tap to select)
────────────────────────────────────────────── */
document.getElementById('q-prios').addEventListener('click', e => {
  const btn = e.target.closest('.prio-btn');
  if (!btn) return;
  // Remove all selected states
  document.querySelectorAll('#q-prios .prio-btn').forEach(b => {
    b.className = 'prio-btn';
  });
  // Apply the correct selected class
  btn.className = 'prio-btn psel-' + btn.dataset.p;
  selPrio = btn.dataset.p;
});

/* ──────────────────────────────────────────────
   ADD TASK
────────────────────────────────────────────── */
function addTask() {
  const name = document.getElementById('q-name').value.trim();
  if (!name) {
    toast('✏️ Type a task name first!', 'orange');
    return;
  }

  const due  = document.getElementById('q-due').value;
  const task = {
    id:       Date.now(),
    name,
    subject:  selSub,
    priority: selPrio,
    due,
    done:     false,
    ts:       Date.now()
  };

  tasks.unshift(task); // add to top of list
  save();

  // Reset name field only (keep subject, priority, date for quick re-use)
  document.getElementById('q-name').value = '';

  renderAll();
  toast('📌 Task added! You can do it! 💪', 'green');
  confetti();
}

// Allow pressing Enter in the name field to add a task
document.getElementById('q-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

/* ──────────────────────────────────────────────
   TOGGLE TASK DONE / UNDONE
────────────────────────────────────────────── */
function toggleTask(id) {
  const task = tasks.find(x => x.id === id);
  if (!task) return;
  task.done = !task.done;
  save();
  renderAll();
  if (task.done) {
    toast('🎉 Awesome! Task done!', 'green');
    confetti();
  }
}

/* ──────────────────────────────────────────────
   DELETE TASK
────────────────────────────────────────────── */
function deleteTask(id) {
  tasks = tasks.filter(x => x.id !== id);
  save();
  renderAll();
  toast('🗑️ Task removed!', '');
}

/* ──────────────────────────────────────────────
   FILTER  (All / Pending / Done / Urgent)
────────────────────────────────────────────── */
function setFilter(f, el) {
  curFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderAllTasks();
}

/* ──────────────────────────────────────────────
   DUE DATE STATUS HELPER
────────────────────────────────────────────── */
/**
 * Returns { cls, label } for a due date string (YYYY-MM-DD).
 * cls:   CSS class for colour  (due-ok | due-soon | due-over)
 * label: Human-readable string (e.g. "Due today!")
 */
function dueStatus(due) {
  if (!due) return { cls: 'due-ok', label: '' };

  const td = today();
  if (due < td)         return { cls: 'due-over', label: '⚠️ Overdue!'       };
  if (due === td)       return { cls: 'due-soon', label: '📅 Due today!'     };
  if (due === addDays(1)) return { cls: 'due-soon', label: '⏰ Due tomorrow'  };

  const d = new Date(due);
  return {
    cls:   'due-ok',
    label: '📆 ' + d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  };
}

/* ──────────────────────────────────────────────
   SMART SUGGESTION  (rule-based hint)
────────────────────────────────────────────── */
function getSuggestion() {
  const pending = tasks.filter(t => !t.done);
  if (!pending.length) return null;

  const td = today();

  // 1. Overdue tasks
  const overdue = pending.filter(t => t.due && t.due < td);
  if (overdue.length)
    return `⚠️ You have ${overdue.length} overdue task! Do it now!`;

  // 2. Due today
  const dueToday = pending.filter(t => t.due === td);
  if (dueToday.length)
    return `👉 Do "${dueToday[0].name.slice(0, 30)}" first – it's due today!`;

  // 3. Due tomorrow
  const tmr = pending.find(t => t.due === addDays(1));
  if (tmr)
    return `📅 "${tmr.name.slice(0, 30)}" is due tomorrow!`;

  // 4. Urgent priority
  const urgent = pending.find(t => t.priority === 'urgent');
  if (urgent)
    return `🚨 "${urgent.name.slice(0, 30)}" is Urgent. Do it soon!`;

  // 5. Generic
  return `💪 You have ${pending.length} task${pending.length > 1 ? 's' : ''} left. Keep going!`;
}

/* ──────────────────────────────────────────────
   TASK CARD HTML BUILDER
────────────────────────────────────────────── */
function taskCard(t) {
  const ds = dueStatus(t.due);
  return `
    <div class="task-card p-${t.priority} ${t.done ? 'done-card' : ''}">
      <div class="check-circle ${t.done ? 'checked' : ''}" onclick="toggleTask(${t.id})">
        ${t.done ? '✓' : ''}
      </div>
      <div class="task-card-body">
        <div class="task-card-name">${t.name}</div>
        <div class="task-card-meta">
          <span class="subject-tag">${t.subject}</span>
          ${ds.label ? `<span class="due-tag ${ds.cls}">${ds.label}</span>` : ''}
        </div>
      </div>
      <button class="del-btn" onclick="deleteTask(${t.id})" title="Delete task">🗑️</button>
    </div>
  `;
}

/* ──────────────────────────────────────────────
   RENDER: HOME TASKS  (top 5 priority)
────────────────────────────────────────────── */
function renderHomeTasks() {
  // Suggestion banner
  const banner   = document.getElementById('home-suggest');
  const hintText = getSuggestion();
  if (hintText) {
    document.getElementById('home-suggest-txt').textContent = hintText;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }

  // Sort pending tasks by priority, show top 5
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const top = [...tasks]
    .filter(t => !t.done)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 5);

  document.getElementById('home-tasks').innerHTML = top.length
    ? top.map(taskCard).join('')
    : `<div class="empty-state">
         <span class="emoji">🎉</span>
         <p>All done! Great job!</p>
         <small>Add more tasks to keep going</small>
       </div>`;
}

/* ──────────────────────────────────────────────
   RENDER: ALL TASKS  (filtered list)
────────────────────────────────────────────── */
function renderAllTasks() {
  const el = document.getElementById('all-tasks');
  if (!el) return;

  let filtered = [...tasks];

  if      (curFilter === 'pending') filtered = filtered.filter(t => !t.done);
  else if (curFilter === 'done')    filtered = filtered.filter(t =>  t.done);
  else if (curFilter === 'urgent')  filtered = filtered.filter(t => t.priority === 'urgent');

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  el.innerHTML = filtered.length
    ? filtered.map(taskCard).join('')
    : `<div class="empty-state">
         <span class="emoji">📭</span>
         <p>Nothing here!</p>
         <small>Add tasks from Home tab</small>
       </div>`;
}

/* ──────────────────────────────────────────────
   RENDER: STATS  (header + XP bar)
────────────────────────────────────────────── */
function renderStats() {
  const total    = tasks.length;
  const done     = tasks.filter(t => t.done).length;
  const dueToday = tasks.filter(t => !t.done && t.due === today()).length;
  const pct      = total ? Math.round(done / total * 100) : 0;

  document.getElementById('st-total').textContent       = total;
  document.getElementById('st-done').textContent        = done;
  document.getElementById('st-due').textContent         = dueToday;
  document.getElementById('header-streak').textContent  = streak;
  document.getElementById('xp-fill').style.width        = pct + '%';
  document.getElementById('xp-pct').textContent         = pct + '%';
}

/* ──────────────────────────────────────────────
   LOG STUDY DAY  (streak button)
────────────────────────────────────────────── */
function logStudy() {
  const td = today();
  if (studyDays.includes(td)) {
    toast('🔥 Already logged today!', 'orange');
    return;
  }

  studyDays.push(td);

  // Extend streak if yesterday was also studied, otherwise reset to 1
  const yesterday = addDays(-1);
  streak = (studyDays.includes(yesterday) || lastStudy === yesterday)
    ? streak + 1
    : 1;

  lastStudy = td;
  save();
  renderAll();
  renderStreak();
  toast(`🔥 ${streak} day streak! Amazing!`, 'green');
  confetti();
}

/* ──────────────────────────────────────────────
   RENDER: STREAK TAB
────────────────────────────────────────────── */
function renderStreak() {
  document.getElementById('streak-num').textContent = streak;

  // Motivational messages indexed by streak count
  const msgs = [
    'Start studying today! 💪',
    '1 day! Great start! 🌱',
    '2 days strong! 🌿',
    '3 days! You\'re on fire! 🔥',
    '4 days! Super student! ⚡',
    '5 days! Wow! 🌟',
    '6 days! Almost a week! 💫',
    '7 days! HERO! 🏆',
  ];
  document.getElementById('streak-msg').textContent =
    streak >= msgs.length ? `🔥 ${streak} days — LEGENDARY!` : msgs[Math.min(streak, msgs.length - 1)];

  // Week bubbles (last 7 days)
  const wrap = document.getElementById('streak-week');
  wrap.innerHTML = '';
  const dayEmojis = ['😴', '📚', '🎯', '💡', '✏️', '🔥', '⭐'];

  for (let i = 6; i >= 0; i--) {
    const d  = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];

    const bubble = document.createElement('div');
    if (studyDays.includes(ds)) {
      bubble.className   = 'week-bubble studied';
      bubble.textContent = '🔥';
    } else if (ds === today()) {
      bubble.className   = 'week-bubble today-unstudied';
      bubble.textContent = 'Today';
    } else {
      bubble.className   = 'week-bubble';
      bubble.textContent = dayEmojis[6 - i];
    }
    bubble.title = ds;
    wrap.appendChild(bubble);
  }

  // Log button state
  const logBtn  = document.getElementById('log-btn');
  const logged  = studyDays.includes(today());
  logBtn.disabled    = logged;
  logBtn.textContent = logged
    ? '✅ Already logged! Come back tomorrow!'
    : '✅ I Studied Today!';

  // Badges
  const badgeDefs = [
    { need: 1,  emoji: '🌱', label: 'First Day!'   },
    { need: 3,  emoji: '🔥', label: '3-Day Streak!' },
    { need: 7,  emoji: '⭐', label: 'One Week!'     },
    { need: 14, emoji: '🏆', label: 'Two Weeks!'    },
    { need: 30, emoji: '👑', label: '30 Days!'      },
  ];

  document.getElementById('badges').innerHTML = badgeDefs.map(b => `
    <div class="badge-item" style="opacity: ${streak >= b.need ? 1 : 0.25}">
      <span class="badge-emoji" style="${streak >= b.need ? 'animation: float 2s ease-in-out infinite;' : ''}">${b.emoji}</span>
      <div class="badge-label">${b.label}</div>
    </div>
  `).join('');
}

/* ──────────────────────────────────────────────
   RENDER: PROGRESS TAB
────────────────────────────────────────────── */
function renderProgress() {
  const total = tasks.length;
  const done  = tasks.filter(t => t.done).length;
  const pct   = total ? Math.round(done / total * 100) : 0;

  // SVG ring
  const ring = document.getElementById('prog-ring');
  if (ring) {
    ring.setAttribute('stroke-dashoffset', 314 - (pct / 100 * 314));
    document.getElementById('prog-pct').textContent = pct + '%';
    document.getElementById('prog-sub').textContent = done + ' of ' + total + ' tasks';
  }

  // Subject breakdown
  const subColors = ['#667eea', '#2ECC71', '#FF6B35', '#E74C3C', '#F39C12', '#1ABC9C'];
  const subMap    = {};
  tasks.forEach(t => {
    if (!subMap[t.subject]) subMap[t.subject] = { t: 0, d: 0 };
    subMap[t.subject].t++;
    if (t.done) subMap[t.subject].d++;
  });

  const subEl = document.getElementById('sub-prog');
  if (subEl) {
    const entries = Object.entries(subMap).sort((a, b) => b[1].t - a[1].t);
    subEl.innerHTML = entries.map(([sub, v], i) => `
      <div class="subject-bar-row">
        <div class="sub-bar-top">
          <span>${sub}</span>
          <span style="color:var(--muted)">${v.d}/${v.t}</span>
        </div>
        <div class="sub-bar-track">
          <div class="sub-bar-fill"
               style="width: ${v.t ? Math.round(v.d / v.t * 100) : 0}%;
                      background: ${subColors[i % subColors.length]}">
          </div>
        </div>
      </div>
    `).join('') || '<div style="color:var(--muted);font-size:13px;font-weight:700;">No tasks yet!</div>';
  }

  // Priority distribution
  const prioData = [
    { key: 'urgent', label: '🚨 Urgent', color: '#E74C3C' },
    { key: 'high',   label: '⚡ High',   color: '#FFD93D' },
    { key: 'medium', label: '📘 Normal', color: '#3498DB' },
    { key: 'low',    label: '😊 Easy',   color: '#2ECC71' },
  ];

  const prioEl = document.getElementById('prio-prog');
  if (prioEl) {
    const maxCount = Math.max(...prioData.map(p => tasks.filter(t => t.priority === p.key).length), 1);
    prioEl.innerHTML = prioData.map(p => {
      const cnt = tasks.filter(t => t.priority === p.key).length;
      return `
        <div class="subject-bar-row">
          <div class="sub-bar-top">
            <span>${p.label}</span>
            <span style="color:var(--muted)">${cnt} tasks</span>
          </div>
          <div class="sub-bar-track">
            <div class="sub-bar-fill"
                 style="width: ${Math.round(cnt / maxCount * 100)}%;
                        background: ${p.color}">
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

/* ──────────────────────────────────────────────
   RENDER ALL  (called after any data change)
────────────────────────────────────────────── */
function renderAll() {
  renderStats();
  renderHomeTasks();
  if (curTab === 'tasks')    renderAllTasks();
}

/* ──────────────────────────────────────────────
   TOAST NOTIFICATION
────────────────────────────────────────────── */
function toast(msg, type) {
  const wrap = document.getElementById('toasts');
  const el   = document.createElement('div');
  el.className   = `toast ${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

/* ──────────────────────────────────────────────
   CONFETTI  (celebration effect)
────────────────────────────────────────────── */
function confetti() {
  const colors = ['#FFD93D', '#FF6B35', '#FF6B9D', '#667eea', '#2ECC71', '#3498DB', '#9B59B6'];

  for (let i = 0; i < 22; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left:                  ${Math.random() * 100}vw;
      top:                   -10px;
      background:            ${colors[Math.floor(Math.random() * colors.length)]};
      width:                 ${7 + Math.random() * 7}px;
      height:                ${7 + Math.random() * 7}px;
      border-radius:         ${Math.random() > 0.5 ? '50%' : '3px'};
      animation-duration:    ${1.2 + Math.random() * 1.4}s;
      animation-delay:       ${Math.random() * 0.4}s;
    `;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3000);
  }
}

/* ──────────────────────────────────────────────
   INITIALISE
────────────────────────────────────────────── */
seed();                                          // load demo data on first run
document.getElementById('q-due').value = today(); // default due date = today
renderAll();
renderStreak();
