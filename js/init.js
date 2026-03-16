import { updateBase, setCombinedData, setIsNextWeek, isNextWeek, setCurrentSubgroup, setShowMoodle } from './state.js';
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

    const itemFromUrl = { 
        type: params.get('type'), 
        id: params.get('id'), 
        name: params.get('name') 
    };

    if (itemFromUrl.type && itemFromUrl.id) {
        loadSchedule(itemFromUrl, true, false);
    } else {
        const cacheIndex = JSON.parse(localStorage.getItem('amgu_cache_index') || "[]");
        
        if (cacheIndex.length > 0) {
            const lastKey = cacheIndex[cacheIndex.length - 1]; 
            const [type, id] = lastKey.split('_');
            
            const rawData = localStorage.getItem(`sched_${lastKey}`);
            if (rawData) {
                try {
                    const entry = JSON.parse(rawData);
                    const data = entry.timestamp ? entry.data : entry;
                    
                    const name = data.group_name || (data.teacher ? data.teacher.name : null) || data.room_name;

                    if (name) {
                        const item = { type, id, name };
                        
                        const subParam = sub > 0 ? `&sub=${sub}` : '';
                        const newUrl = `?type=${type}&id=${id}`;
                        window.history.replaceState(item, "", newUrl);

                        loadSchedule(item, true, false);
                    } else {
                        showSearchView();
                    }
                } catch (e) {
                    showSearchView();
                }
            } else {
                showSearchView();
            }
        } else {
            showSearchView();
        }
    }

    if (isNextWeek) updateNav(1);
    else updateNav(0);
}