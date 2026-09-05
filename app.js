// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;
tg.expand(); // растягиваем на весь экран

// Загрузка баланса (пример)
document.getElementById('coins').textContent = 100;// заменишь на свой API
    .then(res => res.json())
    .then(data => {
        document.getElementById('coins').textContent = data.balance || 0;
    });

// Открытие кейса
function openCase(caseId) {
    tg.sendData(JSON.stringify({ action: 'open_case', caseId }));
}

// Закрытие приложения
function closeApp() {
    tg.close();
}