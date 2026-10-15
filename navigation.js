/* Only navigation presentation changes; photography controllers stay untouched. */
(() => {
 document.documentElement.classList.add('navigation-ready');
 document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('.tool-menu-toggle');
  const header = button?.closest('header');
  if (!button || !header) return;
  const close = () => { header.classList.remove('menu-open'); button.setAttribute('aria-expanded', 'false'); };
  button.addEventListener('click', () => {
   const open = button.getAttribute('aria-expanded') !== 'true';
   header.classList.toggle('menu-open', open); button.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && header.classList.contains('menu-open')) { close(); button.focus(); } });
  window.matchMedia('(min-width: 761px)').addEventListener('change', close);
 });
})();
