window.addEventListener('DOMContentLoaded', () => {
  const link = document.createElement('a');
  link.href = '/Spine-tools';
  link.textContent = 'Back';
  link.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: #000;
    color: #fff;
    padding: 6px 12px;
    border-radius: 4px;
    text-decoration: none;
    z-index: 9999;
    font-family: sans-serif;
  `;
  document.body.appendChild(link);
});
