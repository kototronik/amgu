import { getWeekNumber } from './utils.js';
export const URLS = {
    groups: 'https://cabinet.amursu.ru/public_api/groups',
    teachers: 'https://cabinet.amursu.ru/public_api/teachers',
    classrooms: 'https://cabinet.amursu.ru/public_api/classrooms',
    schedule: {
        group: id => `https://cabinet.amursu.ru/public_api/group/${id}`,
        teacher: id => `https://cabinet.amursu.ru/public_api/teacher/${id}`,
        room: id => `https://cabinet.amursu.ru/public_api/classroom/${id}`
    }
};

export const Cache = {
    INDEX_KEY: 'amgu_cache_index',

    get: (key) => {
        const rawData = localStorage.getItem(`sched_${key}`);
        if (!rawData) return null;

        const entry = JSON.parse(rawData);
        let data = entry.timestamp ? entry.data : entry;
        const timestamp = entry.timestamp || null;

        if (timestamp && data && data.current_week) {
            const savedWeek = getWeekNumber(new Date(timestamp));
            const currentWeek = getWeekNumber(new Date());

            if (savedWeek !== currentWeek) {
                const diff = Math.abs(currentWeek - savedWeek);
                if (diff % 2 !== 0) {
                    data.current_week = data.current_week === 1 ? 2 : 1;
                    console.log(`[Cache] Неделя автоматически переключена: ${data.current_week}`);
                }
            }
        }
        // 

        Cache._touch(key);
        return { data, timestamp };
    },

    set: (key, data) => {
        Cache._touch(key);
        
        const entry = {
            data: data,
            timestamp: Date.now() 
        };

        localStorage.setItem(`sched_${key}`, JSON.stringify(entry));

        const index = JSON.parse(localStorage.getItem(Cache.INDEX_KEY) || "[]");
        if (index.length > 10) {
            const oldKey = index.shift();
            localStorage.removeItem(`sched_${oldKey}`);
            localStorage.setItem(Cache.INDEX_KEY, JSON.stringify(index));
        }
    },

    _touch: (key) => {
        let index = JSON.parse(localStorage.getItem(Cache.INDEX_KEY) || "[]");
        index = index.filter(k => k !== key);
        index.push(key);
        localStorage.setItem(Cache.INDEX_KEY, JSON.stringify(index));
    }
};

export async function fetchBase() {
    try {
        const [g, t, c] = await Promise.all([
            fetch(URLS.groups).then(r => r.json()),
            fetch(URLS.teachers).then(r => r.json()),
            fetch(URLS.classrooms).then(r => r.json())
        ]);
        return [
            ...g.groups.map(i => ({ id: i.id, name: i.name, type: 'group' })),
            ...t.teachers.map(i => ({ id: i.id, name: i.name, type: 'teacher' })),
            ...c.classrooms.map(i => ({ id: i.id, name: i.name, type: 'room' }))
        ];
    } catch (e) {
        throw new Error('offline');
    }
}

export async function fetchSchedule(type, id) {
    const res = await fetch(URLS.schedule[type](id));
    if (!res.ok) throw new Error('server_error');
    return res.json();
}