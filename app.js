// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;
tg.expand();

// Получение данных о пользователе
let user = tg.initDataUnsafe?.user || { id: 0, first_name: "Гость" };
document.getElementById('user-id').textContent = user.id;

// Функция для запроса баланса у бота (через sendData при загрузке)
function getBalance() {
    tg.sendData(JSON.stringify({ action: 'get_balance' }));
}

// Функция для открытия кейса
function openCase(caseId) {
    // Показываем модалку анимации
    showModal('Открываем кейс...');
    // Отправляем данные боту
    tg.sendData(JSON.stringify({ action: 'open_case', caseId: caseId }));
}

// Закрытие приложения
function closeApp() {
    tg.close();
}

// Вспомогательные функции для модалки
function showModal(text) {
    document.getElementById('open-modal').classList.remove('hidden');
    document.getElementById('result-text').textContent = text;
}

function hideModal() {
    document.getElementById('open-modal').classList.add('hidden');
}

// Слушаем ответы от бота (через метод Telegram.WebApp.onEvent)
tg.onEvent('message', function(event) {
    const data = event.data;
    if (typeof data === 'string') {
        try {
            const response = JSON.parse(data);
            if (response.type === 'balance') {
                document.getElementById('coins').textContent = response.balance;
                document.getElementById('cases-opened').textContent = response.cases_opened;
                document.getElementById('ref-link').textContent = response.ref_link;
            }
            if (response.type === 'case_result') {
                hideModal();
                // Показываем результат (упрощенно, можно добавить анимацию выпадения)
                document.getElementById('result-text').textContent = response.message;
                // Обновляем баланс
                document.getElementById('coins').textContent = response.balance;
            }
        } catch (e) {
            console.error('Ошибка парсинга:', e);
        }
    }
});

// При загрузке запрашиваем баланс
getBalance();