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
    get: (key) => {
        const data = localStorage.getItem(`sched_${key}`);
        return data ? JSON.parse(data) : null;
    },
    set: (key, data) => {
        localStorage.setItem(`sched_${key}`, JSON.stringify(data));
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