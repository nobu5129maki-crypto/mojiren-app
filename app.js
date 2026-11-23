// 日記の「今日」は、端末のタイムゾーンではなく日本時間（Asia/Tokyo）で決める。
let entries = loadEntries();
let currentCalendarDate = japanNow();

function japanNow() {
    const parts = {};
    new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(new Date()).forEach((part) => {
        if (part.type !== 'literal') parts[part.type] = part.value;
    });
    let hour = Number(parts.hour);
    if (hour === 24) hour = 0;
    return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour, Number(parts.minute), Number(parts.second));
}

function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function normalizeDate(value) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const matched = String(value ?? '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (matched) {
        return `${matched[1]}-${matched[2].padStart(2, '0')}-${matched[3].padStart(2, '0')}`;
    }
    return dateKey(japanNow());
}

function parseDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatDateLabel(key) {
    const date = parseDateKey(key);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function entryCardHtml(entry) {
    return `
        <div class="space-y-3">
            <div><p class="text-[10px] text-pink-300 font-bold">楽しかった</p><p class="text-sm whitespace-pre-wrap">${escapeHtml(entry.enjoyed)}</p></div>
            <div><p class="text-[10px] text-blue-300 font-bold">できた</p><p class="text-sm whitespace-pre-wrap">${escapeHtml(entry.achieved)}</p></div>
            <div><p class="text-[10px] text-yellow-500 font-bold">感謝した</p><p class="text-sm whitespace-pre-wrap">${escapeHtml(entry.thankful)}</p></div>
        </div>
    `;
}

function loadEntries() {
    let stored = [];
    try {
        stored = JSON.parse(localStorage.getItem('age_entries') || '[]');
    } catch (error) {
        stored = [];
    }
    if (!Array.isArray(stored)) stored = [];
    const normalized = stored
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => ({
            date: normalizeDate(entry.date),
            enjoyed: String(entry.enjoyed ?? ''),
            achieved: String(entry.achieved ?? ''),
            thankful: String(entry.thankful ?? '')
        }));
    localStorage.setItem('age_entries', JSON.stringify(normalized));
    return normalized;
}

function saveEntries() {
    localStorage.setItem('age_entries', JSON.stringify(entries));
}

// ビューの切り替え
function switchView(view) {
    const timelineView = document.getElementById('main-view');
    const calendarView = document.getElementById('calendar-view');
    const navTimeline = document.getElementById('nav-timeline');
    const navCalendar = document.getElementById('nav-calendar');

    if (view === 'calendar') {
        timelineView.classList.add('hidden');
        calendarView.classList.remove('hidden');
        navTimeline.classList.replace('text-pink-400', 'text-gray-400');
        navCalendar.classList.replace('text-gray-400', 'text-pink-400');
        renderCalendar();
    } else {
        timelineView.classList.remove('hidden');
        calendarView.classList.add('hidden');
        navTimeline.classList.replace('text-gray-400', 'text-pink-400');
        navCalendar.classList.replace('text-pink-400', 'text-gray-400');
        renderEntries();
    }
}

// カレンダー描画
function renderCalendar() {
    const daysContainer = document.getElementById('calendar-days');
    const monthLabel = document.getElementById('calendar-month');
    daysContainer.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    monthLabel.innerText = `${year}年 ${month + 1}月`;

    // 月の最初の日と最後の日
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // 前月の埋め
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        daysContainer.appendChild(empty);
    }

    // 今月の日付
    const todayStr = dateKey(japanNow());
    for (let date = 1; date <= lastDate; date++) {
        const dateStr = dateKey(new Date(year, month, date));
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        if (dateStr === todayStr) dayEl.classList.add('today');

        const hasEntry = entries.some(e => e.date === dateStr);
        if (hasEntry) dayEl.classList.add('has-entry');

        dayEl.innerText = date;
        dayEl.onclick = () => showDateDetail(dateStr);
        daysContainer.appendChild(dayEl);
    }
}

function changeMonth(diff) {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth() + diff;
    currentCalendarDate = new Date(year, month, 1);
    renderCalendar();
}

// 特定の日の詳細を表示
function showDateDetail(dateStr) {
    const detailSection = document.getElementById('calendar-detail');
    const content = document.getElementById('selected-entry-content');
    const label = document.getElementById('selected-date-label');
    
    const dayEntries = entries.filter(e => e.date === dateStr);
    detailSection.classList.remove('hidden');
    label.innerText = `${formatDateLabel(dateStr)} の記録`;

    if (dayEntries.length > 0) {
        content.innerHTML = [...dayEntries].reverse().map((entry) => `
            <div class="card p-4 fade-in mb-4">
                ${entryCardHtml(entry)}
            </div>
        `).join('');
    } else {
        content.innerHTML = `
            <div class="text-center py-6 text-gray-400 bg-gray-50 rounded-2xl">
                <p class="text-xs">この日の記録はありません 🌱</p>
            </div>
        `;
    }
}

// 継続日数の計算ロジック
function calculateStreak() {
    if (entries.length === 0) return 0;
    const uniqueDates = [...new Set(entries.map(e => e.date))].sort().reverse();
    const today = japanNow();
    today.setHours(0, 0, 0, 0);
    const lastEntryDate = parseDateKey(uniqueDates[0]);
    const diffDays = Math.round((today - lastEntryDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return 0;

    let streak = 0;
    const entrySet = new Set(uniqueDates);
    const checkDate = new Date(lastEntryDate);
    while (entrySet.has(dateKey(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
}

function updateFlowerUI() {
    const streak = calculateStreak();
    const iconEl = document.getElementById('flower-icon');
    const countEl = document.getElementById('streak-count');
    iconEl.classList.remove('flower-badge');
    if (streak >= 3) {
        iconEl.innerText = '🌸';
        iconEl.classList.add('flower-badge');
        countEl.innerText = `${streak}日連続`;
    } else if (streak === 2) {
        iconEl.innerText = '🌿';
        countEl.innerText = `${streak}日連続`;
    } else if (streak === 1) {
        iconEl.innerText = '🌱';
        countEl.innerText = `${streak}日連続`;
    } else {
        iconEl.innerText = '💤';
        countEl.innerText = 'おやすみ中';
    }
}

function renderEntries() {
    const list = document.getElementById('entry-list');
    list.innerHTML = '';
    updateFlowerUI();
    if (entries.length === 0) {
        list.innerHTML = `<div class="text-center py-10 text-gray-400"><div class="text-4xl mb-2">🌿</div><p class="text-sm">まだ記録がありません。<br>今日を心にとめてみませんか？</p></div>`;
        return;
    }
    [...entries].reverse().forEach((entry, index) => {
        const actualIndex = entries.length - 1 - index;
        const card = document.createElement('div');
        card.className = 'card p-4 fade-in mb-4';
        card.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <span class="text-xs font-bold text-gray-400">${formatDateLabel(entry.date)}</span>
                <div class="flex gap-4">
                    <button onclick="editEntry(${actualIndex})" class="text-blue-300 text-xs">✎ 修正</button>
                    <button onclick="deleteEntry(${actualIndex})" class="text-red-200 text-xs">✕ 削除</button>
                </div>
            </div>
            ${entryCardHtml(entry)}
        `;
        list.appendChild(card);
    });
}

function saveEntry() {
    const enjoyed = document.getElementById('enjoyed').value.trim();
    const achieved = document.getElementById('achieved').value.trim();
    const thankful = document.getElementById('thankful').value.trim();
    const editIndex = parseInt(document.getElementById('edit-index').value, 10);

    if (!enjoyed || !achieved || !thankful) {
        alert('すべての項目を入力してくださいね ✨');
        return;
    }

    if (editIndex > -1 && entries[editIndex]) {
        entries[editIndex].enjoyed = enjoyed;
        entries[editIndex].achieved = achieved;
        entries[editIndex].thankful = thankful;
        cancelEdit();
    } else {
        const dateStr = dateKey(japanNow());
        const alreadyEntryToday = entries.some(e => e.date === dateStr);
        entries.push({ date: dateStr, enjoyed, achieved, thankful });
        if (calculateStreak() === 3 && !alreadyEntryToday) {
            const celeb = document.getElementById('celebration');
            celeb.style.display = 'block';
            setTimeout(() => { celeb.style.display = 'none'; }, 5000);
        }
    }
    saveEntries();
    document.getElementById('enjoyed').value = '';
    document.getElementById('achieved').value = '';
    document.getElementById('thankful').value = '';
    renderEntries();
}

function editEntry(index) {
    const entry = entries[index];
    document.getElementById('enjoyed').value = entry.enjoyed;
    document.getElementById('achieved').value = entry.achieved;
    document.getElementById('thankful').value = entry.thankful;
    document.getElementById('edit-index').value = index;
    document.getElementById('form-title').innerText = "記録を修正する";
    document.getElementById('save-btn').innerText = "修正を保存する";
    document.getElementById('cancel-edit').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    document.getElementById('enjoyed').value = '';
    document.getElementById('achieved').value = '';
    document.getElementById('thankful').value = '';
    document.getElementById('edit-index').value = "-1";
    document.getElementById('form-title').innerText = "今日を記録する";
    document.getElementById('save-btn').innerText = "心にとめる";
    document.getElementById('cancel-edit').classList.add('hidden');
}

function deleteEntry(index) {
    if (confirm('この記録を消してもよろしいですか？')) {
        const editing = parseInt(document.getElementById('edit-index').value, 10);
        entries.splice(index, 1);
        if (editing === index) {
            cancelEdit();
        } else if (editing > index) {
            document.getElementById('edit-index').value = String(editing - 1);
        }
        saveEntries();
        renderEntries();
        if (!document.getElementById('calendar-view').classList.contains('hidden')) {
            renderCalendar();
        }
    }
}

window.onload = () => {
    renderEntries();
    renderCalendar();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    setTimeout(() => {
        const reminder = document.getElementById('reminder');
        reminder.style.display = 'block';
        setTimeout(() => { reminder.style.display = 'none'; }, 4000);
    }, 1000);
};
