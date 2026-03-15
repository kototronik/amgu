import { fetchSchedule, Cache } from './api.js';
import { DOM, showWarningPopup } from './ui.js';
import { setCurrentSchedule, currentSubgroup } from './state.js';
import { render } from './renderer.js';
import { createSkeletonLoader } from './ui.js';
import { getRelativeTimeString } from './utils.js';

export async function loadSchedule(item, shouldScroll = true, pushState = true) {
    if (pushState) {
        const subParam = currentSubgroup > 0 ? `&sub=${currentSubgroup}` : '';
        history.pushState(item, "", `?type=${item.type}&id=${item.id}${subParam}`);
    }

    const cacheKey = `${item.type}_${item.id}`;
    const cached = Cache.get(cacheKey);

    setCurrentSchedule(null);
    DOM.scheduleList.innerHTML = '';

    DOM.searchView.style.display = 'none';
    DOM.scheduleView.style.display = 'block';
    DOM.weekNav.style.display = 'flex';
    DOM.title.textContent = item.name;

    if (cached && cached.data) {
        setCurrentSchedule(cached.data);
        render(shouldScroll);
    } else {
        DOM.scheduleList.innerHTML = createSkeletonLoader();
    }

    try {
        const freshData = await fetchSchedule(item.type, item.id);
        
        setCurrentSchedule(freshData);
        Cache.set(cacheKey, freshData); 
        render(shouldScroll);
        
} catch (e) {
        if (cached && cached.data) {
            const now = Date.now();
            const hoursOld = (now - cached.timestamp) / (1000 * 60 * 60);
            
            if (hoursOld > 12) {
                const relativeTime = getRelativeTimeString(cached.timestamp);
                const message = `внимание:</br>обновлено ${relativeTime}`;
                showWarningPopup(message);
            }
        } else {
            DOM.scheduleList.innerHTML = `
                <div class="error-block">
                    <div style="font-size: 3rem; margin-bottom: 10px;">@_@</div>
                    <h3>ой, я не смог загрузить расписание..</h3>
                    <p>возможно, у тебя включен впн, или АмГУ прилег :/</p>
                    <button class="nav-btn" onclick="location.reload()" style="margin-top:15px; width:auto; padding:10px 20px;">повторить попытку</button>
                </div>`;
        }
    }
}