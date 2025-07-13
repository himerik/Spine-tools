// common.js  (лежит в корне /Spine-tools/common.js)
window.addEventListener('DOMContentLoaded', () => {
  /* --- кнопка "Back" --- */
  const back = document.createElement('a');
  back.href = '/Spine-tools';   // путь на главную
  back.textContent = '← Back';
  back.style.cssText = `
    position: fixed;
    top: 10px;           /* вместо bottom/right */
    left: 10px;
    background: #000;
    color: #fff;
    padding: 6px 12px;
    border-radius: 4px;
    text-decoration: none;
    font-family: sans-serif;
    z-index: 9999;
  `;
  document.body.appendChild(back);

  <script src='https://storage.ko-fi.com/cdn/scripts/overlay-widget.js'></script>
<script>
  kofiWidgetOverlay.draw('kirillme', {
    'type': 'floating-chat',
    'floating-chat.donateButton.text': 'Support me',
    'floating-chat.donateButton.background-color': '#ff38b8',
    'floating-chat.donateButton.text-color': '#fff'
  });
</script>
  const extra = document.createElement('script');
  extra.src = '/Spine-tools/extra.js';   // положи свой скрипт сюда
  extra.defer = true;                    // чтобы не блокировать загрузку
  document.head.appendChild(extra);
});
