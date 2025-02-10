// 存储INI数据的全局变量
let iniData = {};
let translations = {};

// 处理INI文件输入
document.getElementById('iniFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        readFileContent(file).then(content => {
            iniData = parseIni(content);
            displayIniData();
        }).catch(error => console.error(error));
    }
});

// 处理Local.txt文件输入
document.getElementById('localFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        readFileContent(file).then(content => {
            translations = parseTranslations(content);
            displayIniData(); // 重新显示，应用翻译
        }).catch(error => console.error(error));
    }
});

// 导出INI文件
document.getElementById('exportButton').addEventListener('click', function() {
    const iniContent = generateIniContent();
    downloadFile('modified.ini', iniContent);
});

// 读取文件内容
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            resolve(event.target.result);
        };
        reader.onerror = function(event) {
            reject(event.target.error);
        };
        reader.readAsText(file);
    });
}

// 解析INI文件
function parseIni(content) {
    const lines = content.split(/\r?\n/);
    const data = {};
    let currentSection = '';
    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith(';') || line === '') {
            // 注释或空行，跳过
            return;
        } else if (line.startsWith('[') && line.endsWith(']')) {
            // 节
            currentSection = line.slice(1, -1);
            data[currentSection] = {};
        } else {
            // 键值对
            const separatorIndex = line.indexOf(':');
            if (separatorIndex === -1) return;
            const key = line.substring(0, separatorIndex).trim();
            const value = line.substring(separatorIndex + 1).trim();
            if (currentSection) {
                data[currentSection][key] = value;
            }
        }
    });
    return data;
}

// 显示INI数据
function displayIniData() {
    const tbody = document.querySelector('#iniTable tbody');
    tbody.innerHTML = '';
    for (const section in iniData) {
        const translatedSection = translations[section] || section;
        const sectionRow = document.createElement('tr');
        sectionRow.innerHTML = `<td colspan="3" style="background-color: #e8e8e8;"><strong>[${translatedSection}]</strong></td>`;
        tbody.appendChild(sectionRow);
        const keys = iniData[section];
        for (const key in keys) {
            const translatedKey = translations[key] || key;
            const value = keys[key];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${translatedSection}</td>
                <td>${translatedKey}</td>
                <td contenteditable="true" data-section="${section}" data-key="${key}">${value}</td>
            `;
            tbody.appendChild(row);
        }
    }
}

// 解析Local.txt翻译文件
function parseTranslations(content) {
    const lines = content.split(/\r?\n/);
    const trans = {};
    lines.forEach(line => {
        const separatorIndex = line.indexOf('/');
        if (separatorIndex === -1) return;
        const original = line.substring(0, separatorIndex).trim();
        const translated = line.substring(separatorIndex + 1).trim();
        trans[original] = translated;
    });
    return trans;
}

// 生成INI文件内容
function generateIniContent() {
    let content = '';
    for (const section in iniData) {
        content += `\n[${section}]\n`;
        const keys = iniData[section];
        for (const key in keys) {
            const cell = document.querySelector(`td[data-section="${section}"][data-key="${key}"]`);
            const value = cell ? cell.textContent : keys[key];
            content += `${key}: ${value}\n`;
        }
    }
    return content.trim();
}

// 下载文件
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}