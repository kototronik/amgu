import { DOM, renderScheduleCard } from './ui.js';
import { currentSchedule as _currentSchedule, setCurrentSubgroup, currentSubgroup, isNextWeek } from './state.js';
import { formatDate } from './utils.js';
import { setCurrentSchedule } from './state.js'; 

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
        displayName = currentSchedule.group_name === "ИС254" ? "Чиминь" : currentSchedule.group_name;
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

    renderSubgroupPicker(hasSubgroups);

    const hasLines = activeLines.length > 0;
    if (!hasLines) {
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

    DOM.weekStatus.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="18px" fill="#58a6ff"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm360-80h100v-480H520v480Zm-180 0h100v-480H340v480Zm-180 0h100v-480H160v480Zm540 0h100v-480H700v480Z"/></svg>
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
        const dayLessons = activeLines.filter(l => {
            const isCorrectDay = l.weekday === d;
            const isCorrectParity = (l.parity === 0 || l.parity === parity);
            const isCorrectSubgroup = currentSubgroup === 0 || l.subgroup === 0 || l.subgroup === currentSubgroup;

            return isCorrectDay && isCorrectParity && isCorrectSubgroup;
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

    if (renderedDays === 0) {
        DOM.scheduleList.innerHTML = `<div class="error-block"><h3>тут пар нет</h3><p>попробуй сменить неделю или подгруппу.</p></div>`;
    }

    if (shouldScroll && todayElem) {
        setTimeout(() => {
            const currentLesson = todayElem.querySelector('.current-lesson');
            const nextLesson = todayElem.querySelector('.next-lesson');

            const target = currentLesson || nextLesson || todayElem;

            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

export function renderSubgroupPicker(visible) {
    let picker = document.getElementById('subgroup-picker');

    if (!visible) {
        if (picker) picker.style.display = 'none';
        return;
    }

    if (!picker) {
        picker = document.createElement('div');
        picker.id = 'subgroup-picker';
        picker.className = 'subgroup-picker';
        DOM.scheduleList.parentNode.insertBefore(picker, DOM.scheduleList);
    }

    picker.style.display = 'flex';
    picker.innerHTML = `
        <button class="${currentSubgroup === 0 ? 'active' : ''}" data-sub="0">Все</button>
        <button class="${currentSubgroup === 1 ? 'active' : ''}" data-sub="1">1 подгр.</button>
        <button class="${currentSubgroup === 2 ? 'active' : ''}" data-sub="2">2 подгр.</button>
    `;

    picker.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => {
            setCurrentSubgroup(parseInt(btn.dataset.sub));
            const url = new URL(window.location);
            if (currentSubgroup > 0) url.searchParams.set('sub', currentSubgroup);
            else url.searchParams.delete('sub');
            history.replaceState(history.state, "", url);

            const evt = new CustomEvent('amgu_render');
            window.dispatchEvent(evt);
        };
    });
}
