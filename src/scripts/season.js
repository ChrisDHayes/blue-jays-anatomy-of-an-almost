(() => {
  'use strict';

  const games = JSON.parse(document.getElementById('season-json').textContent);
  const diagnostic = JSON.parse(document.getElementById('diagnostic-json').textContent);
  const svgNS = 'http://www.w3.org/2000/svg';
  const graph = document.getElementById('season-graph');
  const slider = document.getElementById('season-slider');
  const feature = document.getElementById('season-feature');
  const modeButtons = [...document.querySelectorAll('[data-season-view]')];
  const venueButtons = [...document.querySelectorAll('[data-place]')];
  const jumpControls = [...document.querySelectorAll('[data-season-jump]')];
  const diagnosticButtons = [...document.querySelectorAll('[data-diagnostic]')];
  const lastGame = games.length;
  const februaryForecast = 82;
  const streakLength = diagnostic.longest_win_streak_observed;
  const streakStartIndex = games.findIndex((_, i) => {
    return games.slice(i, i + streakLength).filter(game => game.result === 'W').length === streakLength;
  });
  const streakStart = games[streakStartIndex].n;
  const streakEnd = streakStart + streakLength - 1;
  const julyFirst = games.find(game => game.date === '2025-07-01').n;
  const dateFormat = new Intl.DateTimeFormat('en-CA', {dateStyle: 'long', timeZone: 'UTC'});
  const percent = new Intl.NumberFormat('en-CA', {style: 'percent', maximumFractionDigits: 1});
  const largestMargin = Math.max(15, Math.ceil(Math.max(...games.map(game => Math.abs(game.diff))) / 5) * 5);
  const text = (id, value) => { document.getElementById(id).textContent = value; };

  let selected = Number(slider.value);
  let mode = 'record';
  let venue = 'all';
  let chartWidth = 0;

  function draw(parent, tag, attrs, label) {
    const element = document.createElementNS(svgNS, tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    if (label !== undefined) element.textContent = label;
    parent.append(element);
    return element;
  }

  function updateSelection() {
    const game = games[selected - 1];
    const date = dateFormat.format(new Date(`${game.date}T12:00:00Z`));
    const site = game.site === 'H' ? 'Home' : 'Road';
    const outcome = game.result === 'W' ? 'Win' : 'Loss';
    const margin = game.diff > 0 ? `+${game.diff}` : String(game.diff).replace('-', '−');
    text('season-selected-kicker', `GAME ${selected} / ${lastGame}`);
    text('season-selected-result', `TOR ${game.for} · ${game.opp} ${game.against}`);
    text('season-selected-meta', `${date} · ${site} · ${outcome}`);
    text('season-selected-record', `Record through this game ${game.wins}–${game.losses} · Margin ${margin}`);
    slider.value = String(selected);
    slider.setAttribute('aria-valuetext', `Game ${selected} of ${lastGame}, ${date}, ${outcome}`);
    for (const step of feature.querySelectorAll('[data-story-step]')) {
      const value = step.dataset.storyStep;
      const active = value === 'streak' ? selected >= streakStart && selected <= streakEnd : selected === Number(value);
      step.dataset.active = String(active);
    }
  }

  function setGame(number, focus = false) {
    selected = Math.max(1, Math.min(lastGame, number));
    updateSelection();
    renderChart(focus);
  }

  function jumpNumber(value) {
    if (value === 'july') return julyFirst;
    if (value === 'streak') return streakEnd;
    return Number(value);
  }

  function handleMarkKey(event) {
    const moves = {ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 1, End: lastGame};
    if (Object.hasOwn(moves, event.key)) {
      event.preventDefault();
      setGame(moves[event.key], true);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setGame(Number(event.currentTarget.dataset.game), true);
    }
  }

  function renderChart(forceFocus = false) {
    const keepFocus = forceFocus || graph.contains(document.activeElement);
    chartWidth = Math.max(230, graph.clientWidth);
    const compact = chartWidth < 505;
    const height = compact ? 286 : 337;
    const left = compact ? 33 : 46;
    const right = chartWidth - (mode === 'record' ? 34 : 15);
    const top = 23;
    const bottom = height - 101;
    const width = right - left;
    const spacing = width / lastGame;
    const lineY = value => bottom - value * (bottom - top) / 100;
    const marginY = value => lineY(50 + 50 * value / largestMargin);
    const x = number => left + (number - 0.5) * spacing;
    const ribbonTop = bottom + 33;
    const inVenue = game => venue === 'all' || game.site === venue;
    const isStreak = selected >= streakStart && selected <= streakEnd;
    const title = mode === 'record' ? 'Cumulative wins' : 'Run margin by game';

    graph.replaceChildren();
    const svg = draw(graph, 'svg', {viewBox: `0 0 ${chartWidth} ${height}`, role: 'group', 'aria-label': title});
    const plot = draw(svg, 'g', {'aria-hidden': 'true'});
    const y = mode === 'record' ? lineY : marginY;
    const ticks = mode === 'record'
      ? [0, 20, 40, 60, 80, 100]
      : Array.from({length: largestMargin / 5 * 2 + 1}, (_, i) => -largestMargin + i * 5);

    if (isStreak) {
      const firstX = left + (streakStart - 1) * spacing;
      draw(plot, 'rect', {x: firstX, y: top, width: streakLength * spacing, height: bottom - top, class: 'season-streak-band'});
      draw(plot, 'text', {x: x((streakStart + streakEnd) / 2), y: top - 9, 'text-anchor': 'middle', class: 'season-streak-label'}, compact ? 'Streak' : `${streakLength} straight wins`);
    }
    for (const value of ticks) {
      const yy = y(value);
      draw(plot, 'line', {x1: left, y1: yy, x2: right, y2: yy, stroke: value === 0 ? '#a3adaf' : '#deded4'});
      draw(plot, 'text', {x: left - 7, y: yy + 3, 'text-anchor': 'end', fill: '#536879', 'font-size': 11}, value);
    }

    if (mode === 'record') {
      const finalWins = games.at(-1).wins;
      const forecastPath = `M ${left} ${lineY(0)} L ${right} ${lineY(februaryForecast)}`;
      const winsPath = `M ${left} ${lineY(0)}${games.map(game => ` H ${x(game.n)} V ${lineY(game.wins)}`).join('')} H ${right}`;
      draw(plot, 'path', {d: `${winsPath} L ${right} ${lineY(februaryForecast)} L ${left} ${lineY(0)} Z`, class: 'season-pace-gap'});
      draw(plot, 'path', {d: forecastPath, class: 'season-forecast-line'});
      draw(plot, 'path', {d: winsPath, class: 'season-wins-line'});
      draw(plot, 'text', {x: right + 6, y: lineY(finalWins) + 4, class: 'season-wins-total'}, finalWins);
      draw(plot, 'text', {x: right + 6, y: lineY(februaryForecast) + 4, class: 'season-forecast-total'}, februaryForecast);
    } else {
      const baseline = marginY(0);
      for (const game of games) {
        const yy = marginY(game.diff);
        draw(plot, 'rect', {x: x(game.n) - spacing * 0.43, y: Math.min(baseline, yy), width: spacing * 0.86, height: Math.abs(baseline - yy), fill: game.result === 'W' ? '#297298' : '#a8594a', opacity: inVenue(game) ? 1 : 0.23});
      }
    }
    const selectedGame = games[selected - 1];
    draw(plot, 'line', {x1: x(selected), x2: x(selected), y1: top, y2: ribbonTop + 28, stroke: '#476779', 'stroke-width': 1.2, 'stroke-dasharray': '3 3'});
    draw(plot, 'circle', {cx: x(selected), cy: y(mode === 'record' ? selectedGame.wins : selectedGame.diff), r: 5.7, fill: '#1c527d', stroke: '#fff', 'stroke-width': 2});

    const gameTicks = compact ? [1, 30, 83, 120, 162] : [1, 30, 60, 90, 120, 162];
    for (const gameNumber of gameTicks) {
      draw(plot, 'text', {x: x(gameNumber), y: height - 22, 'text-anchor': 'middle', fill: '#536879', 'font-size': 11}, gameNumber);
    }
    draw(plot, 'text', {x: (left + right) / 2, y: height - 5, 'text-anchor': 'middle', fill: '#536879', 'font-size': 11}, 'Regular-season game');

    draw(plot, 'rect', {x: left, y: ribbonTop, width, height: 29, rx: 2, fill: '#ece9df'});
    for (const [letter, offset] of [['W', 10], ['L', 25]]) {
      draw(plot, 'text', {x: left - 8, y: ribbonTop + offset, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 750, fill: '#475d6d'}, letter);
    }
    const ribbon = draw(svg, 'g', {role: 'group', 'aria-label': 'Game results, use left and right arrows to browse'});
    for (const game of games) {
      const win = game.result === 'W';
      const current = game.n === selected;
      const mark = draw(ribbon, 'rect', {
        x: x(game.n) - spacing * 0.45, y: ribbonTop + (win ? 1 : 16), width: spacing * 0.9, height: 12,
        fill: win ? '#23699c' : '#a8594a', stroke: current ? '#211a12' : 'none', 'stroke-width': current ? 1.5 : 0,
        opacity: current || inVenue(game) ? 1 : 0.22,
        tabindex: current ? 0 : -1, role: 'button', 'aria-pressed': current,
        'aria-label': `Game ${game.n}, ${game.date}. Toronto ${game.for}, ${game.opp} ${game.against}. ${win ? 'Win' : 'Loss'}.`,
        class: 'season-game-mark', 'data-game': game.n,
      });
      mark.addEventListener('keydown', handleMarkKey);
    }
    svg.addEventListener('click', event => {
      if (event.target.dataset.game) {
        setGame(Number(event.target.dataset.game));
        return;
      }
      const bounds = svg.getBoundingClientRect();
      const px = (event.clientX - bounds.left) * chartWidth / bounds.width;
      const py = (event.clientY - bounds.top) * height / bounds.height;
      if (px >= left && px <= right && py >= ribbonTop - 5 && py <= ribbonTop + 34) {
        setGame(Math.floor((px - left) / spacing) + 1);
      }
    });
    if (keepFocus) ribbon.querySelector(`[data-game="${selected}"]`).focus({preventScroll: true});

    for (const button of modeButtons) button.setAttribute('aria-pressed', String(button.dataset.seasonView === mode));
    for (const button of venueButtons) button.setAttribute('aria-pressed', String(button.dataset.place === venue));
    for (const button of jumpControls.filter(control => control.tagName === 'BUTTON')) {
      const current = button.dataset.seasonJump === 'streak' ? isStreak : jumpNumber(button.dataset.seasonJump) === selected;
      button.setAttribute('aria-current', String(current));
    }
    document.querySelectorAll('[data-legend="record"]').forEach(legend => { legend.hidden = mode !== 'record'; });
  }

  function showDiagnostic(view) {
    const isStreak = view === 'streak';
    const share = isStreak ? diagnostic.p_conditional_longest_streak_at_least_observed : diagnostic.p_conditional_max30_at_least_observed;
    const measure = isStreak ? `a winning streak of ${streakLength} games or longer` : `a 30-game stretch with ${diagnostic.max_30_game_wins_observed} or more wins`;
    text('diagnostic-value', percent.format(share));
    text('diagnostic-label', `of shuffles had ${measure}.`);
    document.getElementById('diagnostic-share').style.width = `${share * 100}%`;
    for (const button of diagnosticButtons) button.setAttribute('aria-pressed', String(button.dataset.diagnostic === view));
  }

  for (const button of modeButtons) button.addEventListener('click', () => { mode = button.dataset.seasonView; renderChart(); });
  for (const button of venueButtons) button.addEventListener('click', () => { venue = button.dataset.place; renderChart(); });
  for (const control of jumpControls) control.addEventListener('click', event => {
    if (feature.dataset.pinned === 'true' && feature.contains(control) && control.tagName === 'A') event.preventDefault();
    setGame(jumpNumber(control.dataset.seasonJump));
  });
  feature.addEventListener('story-step', event => {
    const number = jumpNumber(event.detail);
    if (number !== selected) setGame(number);
  });
  for (const button of diagnosticButtons) button.addEventListener('click', () => showDiagnostic(button.dataset.diagnostic));
  slider.addEventListener('input', event => setGame(Number(event.target.value)));

  const initialBeat = document.getElementById(location.hash.slice(1));
  setGame(feature.contains(initialBeat) && initialBeat.dataset.storyStep ? jumpNumber(initialBeat.dataset.storyStep) : selected);
  showDiagnostic('streak');
  new ResizeObserver(() => {
    if (graph.clientWidth && graph.clientWidth !== chartWidth) renderChart();
  }).observe(graph);
})();
