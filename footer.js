/* Native modal supplies focus containment, Escape dismissal and inert background. */
(() => {
 const dialog = document.getElementById('site-credits');
 const trigger = document.querySelector('[data-open-credits]');
 if (!dialog || !trigger) return;
 let returnFocus;
 trigger.addEventListener('click', event => {
  if (typeof dialog.showModal !== 'function') return;
  event.preventDefault();
  returnFocus = document.activeElement;
  if (!dialog.open) dialog.showModal();
 });
 dialog.addEventListener('close', () => returnFocus?.focus());
 dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
 });
})();
