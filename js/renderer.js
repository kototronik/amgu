import { DOM, renderScheduleCard } from './ui.js';
import { 
    currentSchedule as _currentSchedule, 
    setCurrentSubgroup, 
    currentSubgroup, 
    isNextWeek,
    hasAutoscrolled, 
    setHasAutoscrolled,
    showMoodle, 
    setShowMoodle 
} from './state.js';
import { formatDate } from './utils.js';

export function render(shouldScroll = false) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let foundCurrent = false;
    let foundNext = false;

    const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const [start, end] = timeStr.split('–').map(t => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        });
        return { start, end };
    };

    const currentSchedule = _currentSchedule;
    if (!currentSchedule) return;
    DOM.scheduleList.innerHTML = '';


    let displayName = "Расписание";
    if (currentSchedule.group_name) {
        displayName = currentSchedule.group_name === "ИС254" ? "Чимиль Алля Ахмедович" : currentSchedule.group_name;
    } else if (currentSchedule.teacher) {
        displayName = currentSchedule.teacher;
    } else if (currentSchedule.classroom) {
        displayName = `Ауд. ${currentSchedule.classroom}`;
    }

    DOM.title.textContent = displayName;
    document.title = displayName;

    const activeLines = currentSchedule.timetable_tamplate_lines.filter(l => l.discipline_str);
    

    const hasSubgroups = activeLines.some(l => l.subgroup > 0);
    if (!hasSubgroups) {
        setCurrentSubgroup(0);
    }


    renderSubgroupPicker();
    renderMoodleToggle();

    if (activeLines.length === 0) {
        DOM.weekStatus.style.display = "none";
        DOM.scheduleList.innerHTML = `
            <div class="error-block" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px;">
                <h3 style="margin-bottom: 20px; font-weight: 500;">занятий не найдено..</h3>
                <button id="error-back-btn" class="nav-btn" style="width: fit-content; padding: 10px 25px;">к поиску</button>
            </div>`;
        document.getElementById('error-back-btn').onclick = () => {
            history.replaceState(null, "", window.location.pathname);
            DOM.searchView.style.display = 'block';
            DOM.scheduleView.style.display = 'none';
            DOM.weekNav.style.display = 'none';
        };
        return;
    }

    DOM.weekStatus.style.display = "inline-block";
    const currentWeek = currentSchedule.current_week || 1;
    const parity = isNextWeek ? (currentWeek === 1 ? 2 : 1) : currentWeek;

    DOM.weekStatus.innerHTML = `<div style="display: flex; align-items: center; gap: 6px;"><span>${parity}-я неделя</span></div>`;

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
        const dayLessons = activeLines.filter(l => {
            const isCorrectDay = l.weekday === d;
            const isCorrectParity = (l.parity === 0 || l.parity === parity);
            const isCorrectSubgroup = currentSubgroup === 0 || l.subgroup === 0 || l.subgroup === currentSubgroup;
            

            const isMoodle = l.classroom_str === "Moodle";
            const moodleVisible = showMoodle || !isMoodle;

            return isCorrectDay && isCorrectParity && isCorrectSubgroup && moodleVisible;
        });

        if (dayLessons.length === 0) continue;

        renderedDays++;
        const isToday = (d === todayNum && !isNextWeek);
        const sec = document.createElement('div');
        sec.className = `day-section ${isToday ? 'is-today' : ''}`;
        if (isToday) todayElem = sec;
        sec.innerHTML = `<div class="day-title">${dayNames[d]} ${isToday ? '• СЕГОДНЯ' : ''}</div>`;

        const slots = {};
        dayLessons.forEach(l => {
            if (!slots[l.lesson]) slots[l.lesson] = [];
            const existing = slots[l.lesson].find(item =>
                item.discipline_str === l.discipline_str &&
                item.subgroup === l.subgroup &&
                item.person_id === l.person_id &&
                item.classroom_id === l.classroom_id
            );

            if (existing) {
                if (l.group_str && !existing.groups.some(g => g.id === l.group_id)) {
                    existing.groups.push({ id: l.group_id, name: l.group_str });
                }
            } else {
                const newItem = { ...l, groups: [] };
                if (l.group_str) newItem.groups.push({ id: l.group_id, name: l.group_str });
                slots[l.lesson].push(newItem);
            }
        });

        Object.keys(slots).sort((a, b) => a - b).forEach(lessonNum => {
            const lessonData = { lessonNum: lessonNum, activities: slots[lessonNum] };
            const card = renderScheduleCard(lessonData, times, (it, s, p) => {
                const evt = new CustomEvent('amgu_load_schedule', { detail: { item: it, shouldScroll: s, pushState: p } });
                window.dispatchEvent(evt);
            });

            if (isToday) {
                const timeRange = parseTime(times[lessonNum]);
                if (timeRange) {
                    if (currentMinutes >= timeRange.start && currentMinutes <= timeRange.end) {
                        card.classList.add('current-lesson');
                        foundCurrent = true;
                    } else if (currentMinutes < timeRange.start && !foundCurrent && !foundNext) {
                        card.classList.add('next-lesson');
                        foundNext = true;
                    }
                }
            }
            sec.appendChild(card);
        });

        DOM.scheduleList.appendChild(sec);
    }

    if (renderedDays === 0 && activeLines.length > 0) {
        DOM.scheduleList.innerHTML = `<div class="error-block"><h3>тут пар нет</h3><p>попробуй сменить неделю или настройки фильтров.</p></div>`;
    }


    if (shouldScroll && todayElem && !hasAutoscrolled) {
        setHasAutoscrolled(true); 
        setTimeout(() => {
            const currentLesson = todayElem.querySelector('.current-lesson');
            const nextLesson = todayElem.querySelector('.next-lesson');
            const target = currentLesson || nextLesson || todayElem;

            const stopScroll = () => {
                window.removeEventListener('wheel', stopScroll);
                window.removeEventListener('touchmove', stopScroll);
            };
            window.addEventListener('wheel', stopScroll);
            window.addEventListener('touchmove', stopScroll);
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(stopScroll, 1000);
        }, 100);
    }
}

export function renderSubgroupPicker() {
    const container = DOM.subgroupContainer;
    if (!container) return;

    const activeLines = _currentSchedule?.timetable_tamplate_lines?.filter(l => l.discipline_str) || [];
    const hasSubgroups = activeLines.some(l => l.subgroup > 0);

    const section = container.closest('.menu-section');
    if (section) section.style.display = hasSubgroups ? 'block' : 'none';
    if (!hasSubgroups) return;

    let indicator = container.querySelector('.drawer-indicator');
    
    if (!indicator) {
        container.innerHTML = `
            <div class="drawer-indicator" style="width: calc(33.33% - 4px);"></div>
            <button data-sub="0">Все</button>
            <button data-sub="1">1</button>
            <button data-sub="2">2</button>
        `;
        indicator = container.querySelector('.drawer-indicator');

        container.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                const sub = parseInt(btn.dataset.sub);
                if (sub === currentSubgroup) return;
                setCurrentSubgroup(sub);
                updatePickerUI(container, 'sub', sub);

                const url = new URL(window.location);
                if (sub > 0) url.searchParams.set('sub', sub);
                else url.searchParams.delete('sub');
                history.replaceState(null, "", url);

                render(false);
            };
        });
    }
    updatePickerUI(container, 'sub', currentSubgroup);
}


export function renderMoodleToggle() {
    const container = document.getElementById('moodle-picker'); 
    if (!container) return;

    const activeLines = _currentSchedule?.timetable_tamplate_lines || [];
    const hasMoodle = activeLines.some(l => l.classroom_str === "Moodle");

    const section = container.closest('.menu-section');
    if (section) section.style.display = hasMoodle ? 'block' : 'none';
    if (!hasMoodle) return;

    if (container.innerHTML.trim() === "") {
        container.innerHTML = `
            <button id="moodle-single-btn" class="moodle-toggle-btn">
                <span class="moodle-text">Moodle</span>
            </button>
        `;

        const btn = document.getElementById('moodle-single-btn');
        btn.onclick = () => {
            const newVal = !showMoodle;
            setShowMoodle(newVal);
            
            const url = new URL(window.location);
            if (!newVal) url.searchParams.set('md', '0');
            else url.searchParams.delete('md');
            history.replaceState(null, "", url);

            updateMoodleBtnUI();
            render(false);
        };
    }
    updateMoodleBtnUI();
}

function updateMoodleBtnUI() {
    const btn = document.getElementById('moodle-single-btn');
    if (btn) {
        btn.classList.toggle('active', showMoodle);
    }
}

function updatePickerUI(container, dataAttr, activeVal) {
    const indicator = container.querySelector('.drawer-indicator');
    const buttons = container.querySelectorAll('button');
    if (indicator) {
        indicator.style.transform = `translateX(${activeVal * 100}%)`;
    }
    buttons.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset[dataAttr]) === activeVal);
    });
}