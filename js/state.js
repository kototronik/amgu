import { fetchBase } from './api.js';
import { DOM } from './ui.js';

export const CACHE_KEY = 'amgu_full_data';

export let combinedData = [];
export let currentSchedule = null;
export let isNextWeek = false;
export let currentSubgroup = 0;

export function setCombinedData(d) { combinedData = d; }
export function setCurrentSchedule(s) { currentSchedule = s; }
export function setIsNextWeek(v) { isNextWeek = v; }
export function setCurrentSubgroup(v) { currentSubgroup = v; }

export async function updateBase() {
    try {
        const data = await fetchBase();
        setCombinedData(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ d: combinedData }));
        if (DOM.loader) DOM.loader.textContent = "весь в твоем кармане :3";
    } catch (e) {
        if (DOM.loader) DOM.loader.textContent = combinedData.length > 0 ? "весь в твоем кармане, но у тебя включен впн, или АмГУ спит.." : "у тебя включен впн, или АмГУ спит :/";
    }
}

export let hasAutoscrolled = false;
export function setHasAutoscrolled(val) {
    hasAutoscrolled = val;
}
