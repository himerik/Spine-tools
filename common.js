// common.js  (лежит в /Spine-tools/common.js)
window.addEventListener('DOMContentLoaded', () => {
  /* твоя кнопка "Back" */
  const back = document.createElement('a');
  back.href = '/Spine-tools';
  back.textContent = '← Back';
  back.style.cssText = `
    position: fixed; top: 10px; left: 10px;
    background:#000;color:#fff;padding:6px 12px;border-radius:4px;
    text-decoration:none;font-family:sans-serif;z-index:9999;
  `;
  document.body.appendChild(back);

  
});

<script src='https://storage.ko-fi.com/cdn/scripts/overlay-widget.js'></script>
<script>
  kofiWidgetOverlay.draw('kirillme', {
    'type': 'floating-chat',
    'floating-chat.donateButton.text': 'Support me',
    'floating-chat.donateButton.background-color': '#ff38b8',
    'floating-chat.donateButton.text-color': '#fff'
  });
</script>
