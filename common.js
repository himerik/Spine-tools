// === Кнопка "Назад" в левом верхнем углу ===
window.addEventListener('DOMContentLoaded', () => {
  const back = document.createElement('a');
  back.href = '/Spine-tools';  // ← сюда вставь путь к главной странице
  back.textContent = '← Назад';
  back.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: #000;
    color: #fff;
    padding: 6px 12px;
    border-radius: 4px;
    text-decoration: none;
    font-family: sans-serif;
    font-size: 14px;
    z-index: 9999;
  `;
  document.body.appendChild(back);

  // === Вот сюда вставляй СВОЙ КОД (без изменений) ===
<script src='https://storage.ko-fi.com/cdn/scripts/overlay-widget.js'></script>
<script>
  kofiWidgetOverlay.draw('kirillme', {
    'type': 'floating-chat',
    'floating-chat.donateButton.text': 'Support me',
    'floating-chat.donateButton.background-color': '#ff38b8',
    'floating-chat.donateButton.text-color': '#fff'
  });
</script>
  // --- ВСТАВЛЯЙ ЗДЕСЬ ---
  // Пример: alert('Hello');
  // Не оборачивай в window.onload и т.п. — он уже внутри DOMContentLoaded

});
