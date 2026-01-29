import { fetchBase, fetchSchedule, Cache } from './api.js';
import { smartTranslate, levDistance, highlightText } from './utils.js'; 
import { DOM, renderScheduleCard } from './ui.js';

const CACHE_KEY = 'amgu_full_data';
let combinedData = [];
let currentSchedule = null;
let isNextWeek = false;

async function init() {
    const cachedBase = localStorage.getItem(CACHE_KEY);
    if (cachedBase) {
        try { combinedData = JSON.parse(cachedBase).d || []; } catch(e) {}
    }
    updateBase();
    window.onpopstate = (e) => e.state ? loadSchedule(e.state, false, false) : showSearchView();
    setupEventListeners();

    const params = new URLSearchParams(window.location.search);
    const item = { type: params.get('type'), id: params.get('id') };
    if (item.type && item.id) loadSchedule(item, true, false);
    else showSearchView();
}

async function updateBase() {
    try {
        const data = await fetchBase();
        combinedData = data;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ d: combinedData }));
        if (DOM.loader) DOM.loader.textContent = "весь в твоем кармане :3";
    } catch(e) {
        if (DOM.loader) DOM.loader.textContent = combinedData.length > 0 ? "весь в твоем кармане, но АмГУ спит.." : "АмГУ спит. жди пока проснется, или попробуй посмотреть у одногруппника :/";
    }
}

async function loadSchedule(item, shouldScroll = true, pushState = true) {
    if (pushState) history.pushState(item, "", `?type=${item.type}&id=${item.id}`);
    const cacheKey = `${item.type}_${item.id}`;
    const cachedData = Cache.get(cacheKey);

    currentSchedule = null; 
    DOM.scheduleList.innerHTML = ''; 

    DOM.searchView.style.display = 'none';
    DOM.scheduleView.style.display = 'block';
    DOM.weekNav.style.display = 'flex';
    DOM.title.textContent = item.name;

    if (cachedData) {
        currentSchedule = cachedData;
        render(shouldScroll);
    } else {
        DOM.scheduleList.innerHTML = '<div class="loader-placeholder">подожди, барашка домой зашла...</div>';
    }

    try {
        const freshData = await fetchSchedule(item.type, item.id);
        currentSchedule = freshData;
        Cache.set(cacheKey, freshData);
        render(shouldScroll);
    } catch (e) {
        if (!cachedData) {
            DOM.scheduleList.innerHTML = `
                <div class="error-block">
                    <div style="font-size: 3rem; margin-bottom: 10px;">ой</div>
                    <h3>а где инет?..</h3>
                    <p>прости, это расписание я еще не скачал..</p>
                    <button class="nav-btn" onclick="location.reload()" style="margin-top:15px; width:auto; padding:10px 20px;">Попробовать снова</button>
                </div>`;
        }
    }
}

function showSearchView() {
    DOM.searchView.style.display = 'block';
    DOM.scheduleView.style.display = 'none';
    DOM.weekNav.style.display = 'none';
    document.title = "АмГУ commiunity edition";
    history.replaceState(null, "", window.location.pathname);
}

function render(shouldScroll = false) {
    if (!currentSchedule) return;
    DOM.scheduleList.innerHTML = '';
    
   
    let displayName = "Расписание";
    if (currentSchedule.group_name) {
        displayName = currentSchedule.group_name === "ИС254" ? "Чмиль" : currentSchedule.group_name;
    } else if (currentSchedule.teacher) {
        displayName = currentSchedule.teacher;
    } else if (currentSchedule.classroom) {
        displayName = `Ауд. ${currentSchedule.classroom}`;
    }

    DOM.title.textContent = displayName;
    document.title = displayName;


    const hasLines = currentSchedule.timetable_tamplate_lines && currentSchedule.timetable_tamplate_lines.length > 0;
    
if (!hasLines) {
    DOM.weekStatus.style.display = "none";
    DOM.scheduleList.innerHTML = `
        <div class="error-block" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px;">
            <h3 style="margin-bottom: 20px; font-weight: 500;">занятий не найдено..</h3>
            <button id="error-back-btn" style="
                background: #3c5881; 
                border: 1px solid #3f73a3; 
                padding: 10px 25px; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 0.9rem;
                color: #ffffff;
                width: fit-content; /* Кнопка сожмется под размер текста */
            ">к поиску</button>
        </div>`;
    
    document.getElementById('error-back-btn').onclick = showSearchView;
    return;
}


    DOM.weekStatus.style.display = "inline-block";
    const currentWeek = currentSchedule.current_week || 1;
    const parity = isNextWeek ? (currentWeek === 1 ? 2 : 1) : currentWeek;
    

    DOM.weekStatus.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
            <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14" fill="currentColor"><path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0-33-23.5-56.5T780-80H200Zm0-80h580v-400H200v400Zm0-480h580v-80H200v80Zm0 0v-80 80Z"/></svg>
            <span>${parity}-я неделя</span>
        </div>
    `;


    const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const todayNum = new Date().getDay();
    
    const times = {};
    if (currentSchedule.schedule_lines) {
        currentSchedule.schedule_lines.forEach(l => {
            times[l.lesson] = `${l.begin_time.split('T')[1].slice(0,5)}–${l.end_time.split('T')[1].slice(0,5)}`;
        });
    }

    let todayElem = null;
    let renderedDays = 0;


    for (let d = 1; d <= 6; d++) {
        const lessons = currentSchedule.timetable_tamplate_lines
            .filter(l => l.weekday === d && (l.parity === 0 || l.parity === parity) && l.discipline_str)
            .sort((a,b) => a.lesson - b.lesson);

        if (lessons.length === 0) continue;
        
        renderedDays++;
        const isToday = (d === todayNum && !isNextWeek);
        const sec = document.createElement('div');
        sec.className = `day-section ${isToday ? 'is-today' : ''}`;
        if (isToday) todayElem = sec;

        sec.innerHTML = `<div class="day-title">${dayNames[d]} ${isToday ? '• СЕГОДНЯ' : ''}</div>`;
        
        // Рендер карточки пар через функцию из ui.js
        lessons.forEach(l => sec.appendChild(renderScheduleCard(l, times, loadSchedule)));
        DOM.scheduleList.appendChild(sec);
    }

    // Если в шаблоне пары есть, но конкретно на эту неделю ничего не выпало
    if (renderedDays === 0) {
        DOM.scheduleList.innerHTML = `
            <div class="error-block">
                <div style="font-size: 3rem; margin-bottom: 15px;"></div>
                <h3>тут пар нет</h3>
                <p>переключись на ${isNextWeek ? 'текущую' : 'следующую'} неделю.</p>
            </div>`;
    }

    // Авто-скролл к сегодняшнему дню
    if (shouldScroll && todayElem) {
        setTimeout(() => todayElem.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
}

function setupEventListeners() {
    DOM.searchInput.oninput = (e) => {
        const q = e.target.value.toLowerCase().trim();
        DOM.results.innerHTML = '';
        if (!q) return;

        const trans = smartTranslate(q);
        const labels = { group: 'Группа', teacher: 'преподаватель', room: 'Ауд.' };
        const classes = { group: 'badge-group', teacher: 'badge-teacher', room: 'badge-room' };

        // 1. Прямой поиск с подсветкой
// 1. Прямой поиск с сортировкой
const exactMatches = combinedData
    .filter(i => i.name.toLowerCase().includes(q) || i.name.toLowerCase().includes(trans))
    .sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        
        // Проверяем, начинается ли имя на запрос (q или trans)
        const aStarts = nameA.startsWith(q) || nameA.startsWith(trans);
        const bStarts = nameB.startsWith(q) || nameB.startsWith(trans);

        // Если один начинается на запрос, а другой — нет, поднимаем первый выше
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // Если оба начинаются или оба НЕ начинаются, сортируем просто по алфавиту
        return nameA.localeCompare(nameB);
    });
        
        exactMatches.slice(0, 20).forEach(item => {
            const div = document.createElement('div');
            div.className = 'result-item';
            
            // ПРИМЕНЯЕМ ПОДСВЕТКУ И НОВУЮ ВЕРСТКУ
            const highlighted = highlightText(item.name, q, trans);
            div.innerHTML = `
                <div class="result-name">${highlighted}</div>
                <span class="badge ${classes[item.type]}">${labels[item.type]}</span>
            `;
            
            div.onclick = () => loadSchedule(item, true);
            DOM.results.appendChild(div);
        });

        // 2. Нечеткий поиск
        if (exactMatches.length < 3 && q.length >= 3) {
            const fuzzy = combinedData
                .filter(i => i.type === 'teacher')
                .map(i => {
                    const surname = i.name.split(' ')[0].toLowerCase();
                    const dist = Math.min(levDistance(q, surname), levDistance(trans, surname));
                    return { item: i, dist };
                })
                .filter(res => res.dist <= (q.length > 5 ? 2 : 1))
                .sort((a, b) => a.dist - b.dist);

            if (fuzzy.length > 0) {
                const uniqueFuzzy = fuzzy.filter(f => !exactMatches.some(m => m.id === f.item.id));
                if (uniqueFuzzy.length > 0) {
                    const hint = document.createElement('div');
                    hint.className = 'fuzzy-hint';
                    hint.style = "padding:10px; opacity:0.5; text-align:center; font-size:0.8rem; border-top:1px dashed var(--border);";
                    hint.textContent = "ты не это искал?";
                    DOM.results.appendChild(hint);
                    
                    uniqueFuzzy.slice(0, 5).forEach(res => {
                        const div = document.createElement('div');
                        div.className = 'result-item';
                        
                        // ДЛЯ НЕЧЕТКОГО ПОДСВЕЧИВАЕМ ФАМИЛИЮ ЦЕЛИКОМ
                        const parts = res.item.name.split(' ');
                        const surname = `<span class="highlight">${parts[0]}</span>`;
                        const rest = parts.slice(1).join(' ');
                        
                        div.innerHTML = `
                            <div class="result-name">${surname} ${rest}</div>
                            <span class="badge badge-teacher">преподаватель</span>
                        `;
                        div.onclick = () => loadSchedule(res.item, true);
                        DOM.results.appendChild(div);
                    });
                }
            }
        }
    };

    if (document.getElementById('btn-home')) document.getElementById('btn-home').onclick = showSearchView;
    if (document.getElementById('btn-curr')) document.getElementById('btn-curr').onclick = () => { isNextWeek = false; updateNav(0); render(true); };
    if (document.getElementById('btn-next')) document.getElementById('btn-next').onclick = () => { isNextWeek = true; updateNav(1); render(false); };
}

function updateNav(idx) {
    if (DOM.indicator) DOM.indicator.style.transform = `translateX(${idx * 100}%)`;
    const btnCurr = document.getElementById('btn-curr');
    const btnNext = document.getElementById('btn-next');
    if (btnCurr) btnCurr.classList.toggle('active', idx === 0);
    if (btnNext) btnNext.classList.toggle('active', idx === 1);
}

init();