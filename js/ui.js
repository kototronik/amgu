import { formatName, formatDate } from './utils.js';
const ICONS = {
    room: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M120-120v-80h80v-560q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v560h80v80H120Zm560-80v-560H280v560h400ZM560-440q17 0 28.5-11.5T600-480q0-17-11.5-28.5T560-520q-17 0-28.5 11.5T520-480q0 17 11.5 28.5T560-440ZM280-760v560-560Z"/></svg>',
    person: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/></svg>',
    group: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113ZM120-240h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T440-640q0-33-23.5-56.5T360-720q-33 0-56.5 23.5T280-640q0 33 23.5 56.5T360-560Zm0 320Zm0-400Z"/></svg>',
    clock: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#58a6ff"><path d="m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z"/></svg>',
};
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
    indicator: document.getElementById('nav-indicator'),
    sideMenu: document.getElementById('side-menu'),
    menuOverlay: document.getElementById('menu-overlay'),
    subgroupContainer: document.getElementById('subgroup-container')
};

export function renderScheduleCard(slot, times, loadFn) {
    const card = document.createElement('div');
    card.className = 'lesson-card';
    
    let html = `
        <div class="lesson-header">
            <span>${slot.lessonNum} ПАРА</span>
            <span class="time">${ICONS.clock} ${times[slot.lessonNum] || '--:--'}</span>
        </div>
    `;

    slot.activities.forEach((activity, index) => {
        const subgroupHtml = activity.subgroup > 0 
            ? `<div class="subgroup-row">${activity.subgroup} ПОДГРУППА</div>` 
            : '';
        
        const groupsHtml = (activity.groups && activity.groups.length > 0)
            ? `<div class="groups-row">
                ${activity.groups.map(g => `
                    <div class="link-item group-tag" data-type="group" data-id="${g.id}">
                        ${ICONS.group} <span>${g.name}</span>
                    </div>
                `).join('')}
               </div>`
            : '';


        const updateHtml = activity.updated_at 
            ? `<div class="update-label"> ред: ${formatDate(activity.updated_at)}</div>` 
            : '';

        if (index > 0) html += `<div class="lesson-divider"></div>`;

        html += `
            <div class="activity-block">
                ${subgroupHtml}
                <div class="discipline">${activity.discipline_str}</div>
                <div class="info-row">
                    <div class="link-item" data-type="room" data-id="${activity.classroom_id}">
                        ${ICONS.room} <span>${activity.classroom_str || '—'}</span>
                    </div>
                    <div class="link-item" data-type="teacher" data-id="${activity.person_id}">
                        ${ICONS.person} <span>${formatName(activity.person_str)}</span>
                    </div>
                </div>
                ${groupsHtml}
                ${updateHtml}
            </div>
        `;
    });

    card.innerHTML = html;

    card.querySelectorAll('.link-item').forEach(el => {
el.onclick = (e) => {
    e.stopPropagation();
    const type = el.getAttribute('data-type');
    const id = el.getAttribute('data-id');
    const name = el.querySelector('span').innerText.trim();


    if (id && id !== "null" && id !== "0" && id !== "undefined") {
        el.style.opacity = '0.5'; 
        loadFn({ type, id: String(id), name });
    }
};
    });

    return card;
}