(() => {
  'use strict';

  const nav = document.querySelector('.site-nav');
  const menu = document.querySelector('.chapter-menu');
  const label = document.getElementById('chapter-menu-label');
  const chapters = [...document.querySelectorAll('#chapter-links a')];
  const scenes = [...document.querySelectorAll('main > section, footer#sources')];
  const exhibits = new Map([
    ['#bat-flip', document.getElementById('bat-flip-replay')],
    ['#postseason-outs', document.getElementById('outs-explorer')],
    ['#counterfactual', document.getElementById('bunt-explorer')],
  ]);
  const pinMedia = matchMedia('(min-width: 1051px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)');
  const tracks = [...document.querySelectorAll('.scroll-feature')].map(root => ({
    root, exhibit: root.querySelector('.scroll-exhibit'), steps: [...root.querySelectorAll('[data-story-step]')], last: null,
  }));
  let queued = false;
  let currentScene;
  const readingLine = () => nav.offsetHeight + (innerHeight - nav.offsetHeight) * .34;

  function updatePin() {
    const space = innerHeight - nav.offsetHeight - 46;
    for (const track of tracks) {
      const height = track.exhibit.offsetHeight;
      const pinned = pinMedia.matches && height <= space;
      track.root.dataset.pinned = String(pinned);
      track.root.style.setProperty('--last-step-height', `${height + 16}px`);
      if (!pinned) track.last = null;
    }
    scheduleChapterUpdate();
  }

  function followStory() {
    if (!pinMedia.matches) return;
    const line = readingLine();
    for (const track of tracks) {
      if (track.root.dataset.pinned !== 'true') continue;
      const bounds = track.root.getBoundingClientRect();
      if (bounds.top > line || bounds.bottom <= line) {
        track.last = null;
        continue;
      }
      const current = track.steps.findLast(step => step.getBoundingClientRect().top <= line);
      if (current && current !== track.last) {
        track.last = current;
        track.root.dispatchEvent(new CustomEvent('story-step', {detail: current.dataset.storyStep}));
      }
    }
  }

  function markChapter() {
    queued = false;
    const available = document.documentElement.scrollHeight - innerHeight;
    nav.style.setProperty('--story-progress', String(available > 0 ? Math.min(1, Math.max(0, scrollY / available)) : 0));
    followStory();
    const marker = nav.getBoundingClientRect().bottom + Math.min(115, window.innerHeight * 0.16);
    const atEnd = innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const visibleScene = scenes.findLast(section => section.getBoundingClientRect().top <= marker);
    const lastScene = location.hash === '#sources' || visibleScene === scenes.at(-1) ? scenes.at(-1) : scenes.at(-2);
    const scene = atEnd ? lastScene : visibleScene;
    if (scene === currentScene) return;
    currentScene = scene;
    const chapter = scene?.id === 'counterfactual' ? 'game7' : scene?.id;
    const active = chapters.find(link => link.hash === `#${chapter}`);
    for (const link of chapters) {
      if (link === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    label.textContent = active?.textContent || 'Chapters';
  }

  function scheduleChapterUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(markChapter);
  }

  function closeMenu() { menu.setAttribute('aria-expanded', 'false'); }
  function openLinkedExhibit(hash) {
    const exhibit = exhibits.get(hash);
    if (exhibit && !exhibit.open) exhibit.open = true;
  }

  menu.addEventListener('click', () => {
    menu.setAttribute('aria-expanded', String(menu.getAttribute('aria-expanded') !== 'true'));
  });
  for (const link of chapters) link.addEventListener('click', closeMenu);
  document.addEventListener('pointerdown', event => { if (!nav.contains(event.target)) closeMenu(); });
  nav.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menu.focus();
    }
  });
  window.addEventListener('scroll', scheduleChapterUpdate, {passive: true});
  window.addEventListener('resize', updatePin);
  for (const hash of exhibits.keys()) {
    for (const link of document.querySelectorAll(`a[href="${hash}"]`)) {
      link.addEventListener('click', event => {
        if (!(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) openLinkedExhibit(hash);
      });
    }
  }
  window.addEventListener('hashchange', () => {
    openLinkedExhibit(location.hash);
    scheduleChapterUpdate();
  });
  pinMedia.addEventListener('change', updatePin);
  const exhibitResize = new ResizeObserver(updatePin);
  for (const track of tracks) exhibitResize.observe(track.exhibit);
  openLinkedExhibit(location.hash);
  updatePin();
  markChapter();

  const objectives = {
    tie: {
      heading: 'Extend the game or win it here',
      text: 'Estimate the chance of scoring at least once before the third out. Exactly one run sends it to the 12th. Two or more win it immediately.',
      evidence: 'Track how the runner can advance or score after each possible plate outcome, including failed bunt attempts.',
    },
    win: {
      heading: 'Win from this position',
      text: 'Estimate the chance of winning, counting both walk-offs in the 11th and wins after a tie.',
      evidence: 'Use the same inning outcomes and estimate what happens after a tie, including bullpen options and the next innings.',
    },
  };
  const objectiveButtons = [...document.querySelectorAll('[data-objective]')];

  function setObjective(value) {
    const objective = objectives[value];
    for (const button of objectiveButtons) button.setAttribute('aria-pressed', String(button.dataset.objective === value));
    document.getElementById('objective-heading').textContent = objective.heading;
    document.getElementById('objective-text').textContent = objective.text;
    document.getElementById('objective-evidence').textContent = objective.evidence;
  }

  for (const button of objectiveButtons) button.addEventListener('click', () => setObjective(button.dataset.objective));
  setObjective('tie');
})();
