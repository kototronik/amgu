const URLS = {
    groups: 'https://cabinet.amursu.ru/public_api/groups',
    teachers: 'https://cabinet.amursu.ru/public_api/teachers',
    classrooms: 'https://cabinet.amursu.ru/public_api/classrooms'
};
const CACHE_KEY = 'amgu_full_data';
const CACHE_TIME = 3 * 60 * 60 * 1000;

const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('resultsList');
const loader = document.getElementById('loader');

let combinedData = [];

const layoutMap = {'q':'й','w':'ц','e':'у','r':'к','t':'е','y':'н','u':'г','i':'ш','o':'щ','p':'з','[':'х',']':'ъ','a':'ф','s':'ы','d':'в','f':'а','g':'п','h':'р','j':'о','k':'л','l':'д',';':'ж',"'":"э",'z':'я','x':'ч','c':'с','v':'м','b':'и','n':'т','m':'ь',',':'б','.':'ю'};

function smartTranslate(text) {
    return text.split('').map(char => layoutMap[char.toLowerCase()] || char.toLowerCase()).join('');
}

function levDistance(s1, s2) {
    if (s1.length < s2.length) [s1, s2] = [s2, s1];
    let prevRow = Array.from({length: s2.length + 1}, (_, i) => i);
    for (let i = 0; i < s1.length; i++) {
        let currRow = [i + 1];
        for (let j = 0; j < s2.length; j++) {
            let substitutions = prevRow[j] + (s1[i] !== s2[j] ? 1 : 0);
            currRow.push(Math.min(prevRow[j + 1] + 1, currRow[j] + 1, substitutions));
        }
        prevRow = currRow;
    }
    return prevRow[s2.length];
}

async function initData() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TIME) {
            combinedData = parsed.data;
            loader.textContent = 'весь в твоем кармане :)';
            return;
        }
    }
    await refreshData();
}

async function refreshData() {
    if (!navigator.onLine) return;
    loader.textContent = 'подожди, загружаю...';
    try {
        const [resG, resT, resC] = await Promise.all([
            fetch(URLS.groups), fetch(URLS.teachers), fetch(URLS.classrooms)
        ]);

        const [gData, tData, cData] = await Promise.all([
            resG.json(), resT.json(), resC.json()
        ]);

        combinedData = [
            ...gData.groups.map(i => ({ name: i.name, type: 'group' })),
            ...tData.teachers.map(i => ({ name: i.name, type: 'teacher' })),
            ...cData.classrooms.map(i => ({ name: i.name, type: 'room' }))
        ];

        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: combinedData }));
        loader.textContent = 'все супер!';
    } catch (e) {
        loader.textContent = 'не могу загрузить данные :(';
    }
}

function renderItem(item) {
    const labels = { group: 'Группа', teacher: 'Преподаватель', room: 'Аудитория' };
    const classes = { group: 'badge-group', teacher: 'badge-teacher', room: 'badge-room' };
    
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `
        <span>${item.name}</span>
        <span class="badge ${classes[item.type]}">${labels[item.type]}</span>
    `;
    resultsList.appendChild(div);
}

function performSearch(query) {
    resultsList.innerHTML = '';
    if (!query) return;

    const translated = smartTranslate(query);
    
    // 1. Точный поиск (включает подстроки)
    let exactMatches = combinedData.filter(item => {
        const n = item.name.toLowerCase();
        return n.includes(query) || n.includes(translated);
    });

    if (exactMatches.length > 0) {
        exactMatches.slice(0, 30).forEach(renderItem);
    } 
    // 2. Нечеткий поиск по преподавателям, если точных мало
    if (exactMatches.length < 3 && query.length >= 3) {
        const fuzzy = combinedData
            .filter(i => i.type === 'teacher')
            .map(i => {
                const surname = i.name.split(' ')[0].toLowerCase();
                const dist = levDistance(query, surname);
                const distTrans = levDistance(translated, surname);
                return { item: i, dist: Math.min(dist, distTrans) };
            })
            .filter(res => res.dist <= (query.length > 6 ? 2 : 1))
            .sort((a, b) => a.dist - b.dist)
            .map(res => res.item);

        if (fuzzy.length > 0) {
            const hint = document.createElement('div');
            hint.className = 'fuzzy-hint';
            hint.textContent = exactMatches.length > 0 ? 'Возможно, вы искали:' : 'Похожие результаты:';
            resultsList.appendChild(hint);
            
            // Убираем дубликаты, которые уже есть в точном поиске
            const uniqueFuzzy = fuzzy.filter(f => !exactMatches.includes(f));
            uniqueFuzzy.slice(0, 5).forEach(renderItem);
        }
    }

    if (resultsList.innerHTML === '') {
        resultsList.innerHTML = `<div class="no-results">Ничего не найдено</div>`;
    }
}

searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    performSearch(val);
});

initData();