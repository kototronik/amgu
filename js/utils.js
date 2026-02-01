const layoutMap = {'q':'й','w':'ц','e':'у','r':'к','t':'е','y':'н','u':'г','i':'ш','o':'щ','p':'з','[':'х',']':'ъ','a':'ф','s':'ы','d':'в','f':'а','g':'п','h':'р','j':'о','k':'л','l':'д',';':'ж',"'":"э",'z':'я','x':'ч','c':'с','v':'м','b':'и','n':'т','m':'ь',',':'б','.':'ю'};

export function smartTranslate(text) {
    return text.split('').map(char => layoutMap[char.toLowerCase()] || char.toLowerCase()).join('');
}

export function levDistance(s1, s2) {
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

export function formatName(s) {
    if (!s) return "—";
    const p = s.trim().split(/\s+/);
    return p.length < 2 ? s : `${p[0]} ${p.slice(1).map(x => x[0] + ".").join("")}`;
}
export function formatDate(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month} ${hours}:${minutes}`;
}
export function highlightText(fullText, query, trans) {
    if (!query) return fullText;
    
    const q = query.toLowerCase();
    const t = trans.toLowerCase();
    const lowerText = fullText.toLowerCase();
    
    let match = "";
    if (lowerText.includes(q)) match = q;
    else if (lowerText.includes(t)) match = t;

    if (match) {
        const startIdx = lowerText.indexOf(match);
        const endIdx = startIdx + match.length;
        return fullText.slice(0, startIdx) + 
               `<span class="highlight">${fullText.slice(startIdx, endIdx)}</span>` + 
               fullText.slice(endIdx);
    }
    return fullText;
}