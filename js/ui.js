import { formatName, formatDate } from './utils.js';
const ICONS = {
    room: '<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z"/></svg>',
    person: '<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z"/></svg>',
    clock: '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>'
};
/**
 * Объект с ссылками на все основные элементы DOM для быстрого доступа.
 */
export const DOM = {
    searchView: document.getElementById('search-view'),
    scheduleView: document.getElementById('schedule-view'),
    scheduleList: document.getElementById('schedule-list'),
    weekNav: document.getElementById('week-nav'),
    title: document.getElementById('view-title'),
    loader: document.getElementById('loader'),
    results: document.getElementById('resultsList'),
    searchInput: document.getElementById('searchInput'),
    weekStatus: document.getElementById('week-status'),
    indicator: document.getElementById('nav-indicator')
};

/**
 * @param {Object} lesson - Объект данных занятия из API.
 * @param {Object} times - Словарь соответствия номера пары и времени её проведения.
 * @param {Function} loadFn - Функция обратного вызова для перехода к расписанию по клику на ссылку.
 */
export function renderScheduleCard(lesson, times, loadFn) {
    const card = document.createElement('div');
    card.className = 'lesson-card';
    const updated = formatDate(lesson.updated_at);

    card.innerHTML = `
        <div class="lesson-header">
            <span>${lesson.lesson} ПАРА</span>
            <span class="time">${ICONS.clock} ${times[lesson.lesson] || '--:--'}</span>
        </div>
        <div class="discipline">${lesson.discipline_str}</div>
        <div class="info-row">
            <div class="link-item" data-type="room" data-id="${lesson.classroom_id}">
                ${ICONS.room} <span>${lesson.classroom_str || '—'}</span>
            </div>
            <div class="link-item" data-type="teacher" data-id="${lesson.person_id}">
                ${ICONS.person} <span>${formatName(lesson.person_str)}</span>
            </div>
        </div>
        ${updated ? `<div class="update-label">ред.  ${updated}</div>` : ''}
    `;
    
    // Находит все кликабельные элементы (преподаватель, аудитория) внутри карточки
    card.querySelectorAll('.link-item').forEach(el => {
        el.onclick = (e) => {
            // Предотвращает всплытие события, чтобы клик не срабатывал на родителе
            e.stopPropagation();
            const { type, id } = el.dataset;
            
            // Загружаем новое расписание только если есть валидный ID
            if (id && id !== "null" && id !== "undefined" && id !== "0") {
                loadFn({ type, id });
            }
        };
    });
    
    return card;
}

export function showToast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 500);
    }, 2000);
}