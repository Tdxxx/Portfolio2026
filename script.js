// Custom cursor: a small solid dot tracks the mouse exactly, a larger
// hairline ring trails it with a bit of ease and blooms open over
// links/buttons. Mouse-only — skipped entirely on touch/coarse pointers,
// and simplified (no easing loop) for reduced motion.

(function () {
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!isFinePointer) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.body.classList.add('has-fine-pointer');

  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;

    if (prefersReducedMotion) {
      ringX = mouseX;
      ringY = mouseY;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    }
  });

  if (!prefersReducedMotion) {
    const EASE = 0.16;
    const tick = () => {
      ringX += (mouseX - ringX) * EASE;
      ringY += (mouseY - ringY) * EASE;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const interactiveSelector = 'a, button, .serviceButton, input, textarea, select, [role="button"]';

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveSelector)) ring.classList.add('is-active');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactiveSelector)) ring.classList.remove('is-active');
  });

  window.addEventListener('mousedown', () => ring.classList.add('is-pressed'));
  window.addEventListener('mouseup', () => ring.classList.remove('is-pressed'));

  document.addEventListener('mouseleave', () => {
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity = '';
    ring.style.opacity = '';
  });
})();