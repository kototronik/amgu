import { DOM } from './ui.js';
import { smartTranslate, levDistance, highlightText } from './utils.js';
import { combinedData, setCurrentSubgroup, CACHE_KEY, setIsNextWeek, isNextWeek } from './state.js';
import { loadSchedule } from './loader.js';
import { render } from './renderer.js';
import { setHasAutoscrolled } from './state.js';

export function showSearchView() {
    setCurrentSubgroup(0);
    const picker = document.getElementById('subgroup-picker');
    if (picker) picker.remove();

    DOM.searchView.style.display = 'block';
    DOM.scheduleView.style.display = 'none';
    DOM.weekNav.style.display = 'none';
    document.title = "АмГУ Community edition";
    history.replaceState(null, "", window.location.pathname);
}

export function updateNav(idx) {
    if (DOM.indicator) DOM.indicator.style.transform = `translateX(${idx * 100}%)`;
    const btnCurr = document.getElementById('btn-curr');
    const btnNext = document.getElementById('btn-next');
    if (btnCurr) btnCurr.classList.toggle('active', idx === 0);
    if (btnNext) btnNext.classList.toggle('active', idx === 1);
}

export function setupEventListeners() {
    const btnMenu = document.getElementById('btn-menu');
    const btnClose = document.getElementById('menu-close');
    


    const toggleMenu = () => {
        if (DOM.sideMenu && DOM.menuOverlay) {
            DOM.sideMenu.classList.toggle('active');
            DOM.menuOverlay.classList.toggle('active');
            
            if (btnMenu) {
                btnMenu.classList.toggle('active');
            }
            
            if (DOM.sideMenu.classList.contains('active')) {
                if (typeof renderSubgroupPicker === 'function') {
                    renderSubgroupPicker(); 
                }
            }
        }
    };


    if (btnMenu) btnMenu.onclick = toggleMenu;
    if (btnClose) btnClose.onclick = toggleMenu;
    if (DOM.menuOverlay) DOM.menuOverlay.onclick = toggleMenu;
    DOM.searchInput.oninput = (e) => {
        const q = e.target.value.toLowerCase().trim();
        DOM.results.innerHTML = '';
        if (!q) return;

        const trans = smartTranslate(q);
        const labels = { group: 'Группа', teacher: 'преподаватель', room: 'Ауд.' };
        const classes = { group: 'badge-group', teacher: 'badge-teacher', room: 'badge-room' };
        
        const exactMatches = combinedData
            .filter(i => i.name.toLowerCase().includes(q) || i.name.toLowerCase().includes(trans))
            .sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();

                const aStarts = nameA.startsWith(q) || nameA.startsWith(trans);
                const bStarts = nameB.startsWith(q) || nameB.startsWith(trans);

                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                return nameA.localeCompare(nameB);
            });

        exactMatches.slice(0, 20).forEach(item => {
            const div = document.createElement('div');
            div.className = 'result-item';

            const highlighted = highlightText(item.name, q, trans);
            div.innerHTML = `
                <div class="result-name">${highlighted}</div>
                <span class="badge ${classes[item.type]}">${labels[item.type]}</span>
            `;

            div.onclick = () => loadSchedule(item, true);
            DOM.results.appendChild(div);
        });

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
    if (document.getElementById('btn-curr')) {
        document.getElementById('btn-curr').onclick = () => {
            if (!isNextWeek) {
                render(false);
                const todayElem = document.querySelector('.is-today');
                if (todayElem) {
                    const target = todayElem.querySelector('.current-lesson') ||
                        todayElem.querySelector('.next-lesson') ||
                        todayElem;
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                setIsNextWeek(false);
                updateNav(0);
                render(false);
            }
        };
    }

    if (document.getElementById('btn-next')) {
        document.getElementById('btn-next').onclick = () => {
            if (isNextWeek) return;
            setIsNextWeek(true);
            updateNav(1);
            render(false);
        };
    }

window.addEventListener('amgu_load_schedule', (e) => {
        const { item, shouldScroll = true, pushState = true } = e.detail;
        if (shouldScroll) {
            setHasAutoscrolled(false);
        }
        loadSchedule(item, shouldScroll, pushState);
    });

}
