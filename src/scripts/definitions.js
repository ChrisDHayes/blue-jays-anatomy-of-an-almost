(() => {
  'use strict';

  const definitions = new Map([...document.querySelectorAll('[data-definition]')]
    .map(definition => [definition.dataset.definition, definition.textContent.trim()]));
  const tip = document.createElement('span');
  tip.className = 'metric-tooltip';
  tip.setAttribute('aria-hidden', 'true');
  tip.hidden = true;

  let active = null;
  let pinned = false;
  let leaveTimer;

  function dismiss() {
    window.clearTimeout(leaveTimer);
    tip.hidden = true;
    active = null;
    pinned = false;
  }

  function placeTip() {
    if (!active) return;
    const anchor = active.getBoundingClientRect();
    const viewport = document.documentElement;
    if (!active.isConnected || !anchor.width || anchor.bottom <= 0 || anchor.top >= viewport.clientHeight) {
      dismiss();
      return;
    }
    const margin = 8;
    const left = Math.min(viewport.clientWidth - tip.offsetWidth - margin, anchor.left + (anchor.width - tip.offsetWidth) / 2);
    const below = anchor.bottom + margin;
    const top = below + tip.offsetHeight < viewport.clientHeight - margin ? below : anchor.top - tip.offsetHeight - margin;
    tip.style.left = `${Math.max(margin, left)}px`;
    tip.style.top = `${Math.max(margin, top)}px`;
  }

  function show(trigger, keepOpen = false) {
    const definition = definitions.get(trigger.dataset.metric);
    if (!definition) return;
    window.clearTimeout(leaveTimer);
    active = trigger;
    pinned = keepOpen;
    const container = trigger.closest('dialog') || document.body;
    if (tip.parentElement !== container) container.append(tip);
    tip.textContent = definition;
    tip.hidden = false;
    placeTip();
  }

  document.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    if (tip.contains(event.target)) {
      window.clearTimeout(leaveTimer);
      return;
    }
    const trigger = event.target.closest('button[data-metric]');
    if (trigger && !pinned) show(trigger);
  });

  document.addEventListener('pointerout', event => {
    if (!active || pinned || active.matches(':focus-visible')) return;
    if (!active.contains(event.target) && !tip.contains(event.target)) return;
    if (active.contains(event.relatedTarget) || tip.contains(event.relatedTarget)) return;
    leaveTimer = window.setTimeout(dismiss, 150);
  });

  document.addEventListener('focusin', event => {
    const trigger = event.target.closest('button[data-metric]');
    if (trigger?.matches(':focus-visible')) show(trigger);
  });
  document.addEventListener('focusout', event => {
    if (event.target === active) dismiss();
  });

  document.addEventListener('click', event => {
    const trigger = event.target.closest('button[data-metric]');
    if (trigger) {
      if (pinned && active === trigger) dismiss();
      else show(trigger, true);
    } else if (active && !tip.contains(event.target)) dismiss();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) {
      event.preventDefault();
      dismiss();
    }
  });
  document.addEventListener('scroll', placeTip, true);
  document.addEventListener('close', event => {
    if (event.target === tip.parentElement) dismiss();
  }, true);
  window.addEventListener('resize', placeTip);
})();
