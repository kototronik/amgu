import { updateBase, combinedData as _combinedData, setCombinedData, setIsNextWeek, isNextWeek, setCurrentSubgroup, setShowMoodle } from './state.js';
import { setupEventListeners, showSearchView, updateNav } from './events.js';
import { loadSchedule } from './loader.js';
import { setupThemePicker } from './events.js';

export default async function init() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    setupThemePicker();

const params_M = new URLSearchParams(window.location.search);


const moodParam = params_M.get('md');
if (moodParam === '0') {
    setShowMoodle(false);
} else {
    setShowMoodle(true);
}
    if (dayOfWeek === 0 || (dayOfWeek === 6 && hour >= 16)) {
        setIsNextWeek(true);
    }

    const cachedBase = localStorage.getItem('amgu_full_data');
    if (cachedBase) {
        try {
            setCombinedData(JSON.parse(cachedBase).d || []);
        } catch (e) {
            console.error("Ошибка парсинга кэша:", e);
        }
    }

    updateBase();

    window.onpopstate = (e) => {
        if (e.state) {
            loadSchedule(e.state, false, false);
        } else {
            showSearchView();
        }
    };

    setupEventListeners();

    const params = new URLSearchParams(window.location.search);
    const sub = parseInt(params.get('sub')) || 0;
    setCurrentSubgroup(sub);
    const item = { type: params.get('type'), id: params.get('id'), name: params.get('name') };

    if (item.type && item.id) {
        loadSchedule(item, true, false);

        if (isNextWeek) {
            updateNav(1);
        } else {
            updateNav(0);
        }
    } else {
        showSearchView();
    }
}
