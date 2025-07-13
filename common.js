// Функция для добавления кнопки "Back"
function addBackButton() {
  const backButton = document.createElement('button');
  backButton.textContent = 'Back';
  backButton.style.position = 'fixed';
  backButton.style.top = '10px';
  backButton.style.left = '10px';
  backButton.style.padding = '8px 12px';
  backButton.style.backgroundColor = '#333';
  backButton.style.color = '#fff';
  backButton.style.border = 'none';
  backButton.style.borderRadius = '4px';
  backButton.style.cursor = 'pointer';
  backButton.style.zIndex = '1000';
  backButton.onclick = () => history.back();
  document.body.appendChild(backButton);
}

// Функция для добавления Ko-fi виджета
function addKofiWidget() {
  // Добавляем скрипт Ko-fi
  const kofiScript = document.createElement('script');
  kofiScript.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
  document.body.appendChild(kofiScript);

  // После загрузки скрипта инициализируем виджет
  kofiScript.onload = () => {
    const widgetScript = document.createElement('script');
    widgetScript.textContent = `
      kofiWidgetOverlay.draw('kirillme', {
        'type': 'floating-chat',
        'floating-chat.donateButton.text': 'Support me',
        'floating-chat.donateButton.background-color': '#ffffff',
        'floating-chat.donateButton.text-color': '#323842'
      });
    `;
    document.body.appendChild(widgetScript);
  };
}

// Выполняем функции после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  addBackButton();
  addKofiWidget();
});
