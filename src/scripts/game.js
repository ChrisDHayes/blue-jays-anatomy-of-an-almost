const gameChart = $('game-chart');
const gameSteps = $('game-steps');
const gameExplorer = $('game-play-explorer');
const gameEvents = DATA.events;
const gameLength = DATA.innings.tor.length;
const inningOf = event => Number(event.inning.match(/\d+/)[0]);
const buntIndex = gameEvents.findIndex(event => event.pn === 99);
const gameGuideCopy = {
  24: 'Bo Bichette’s three-run homer gives Toronto a 3–0 lead in the third.',
  76: 'Toronto leads 4–3 in the ninth. Miguel Rojas homers to tie the game.',
  98: 'Will Smith puts Los Angeles ahead 5–4. Vladimir Guerrero Jr. opens the bottom of the 11th with a double, putting the tying run on second.',
};
const gameGuideButtons = [...document.querySelectorAll('[data-guide-play]')];
const gameButtons = gameEvents.map((event, index) => {
  const button = document.createElement('button');
  const inning = document.createElement('span');
  inning.className = 'step-no';
  text(inning, event.inning.toUpperCase());
  button.type = 'button';
  button.append(inning, document.createTextNode(event.title));
  button.addEventListener('click', () => selectMoment(index));
  gameSteps.append(button);
  return button;
});
let gameStep = 0;
let lastGuidedStep = 0;
let gameMode = 'score';
let gameWidth = 0;

function selectMoment(index) {
  gameStep = index;
  if (!gameExplorer.open) lastGuidedStep = index;
  const event = gameEvents[index];
  const bases = ['1st', '2nd', '3rd'].filter((_, base) => event.bases & (1 << base));
  const outs = `${event.outs} ${event.outs === 1 ? 'out' : 'outs'}`;

  text($('moment-inning'), event.inning);
  text($('moment-title'), event.title);
  text($('moment-desc'), event.description);
  text($('moment-score'), `LAD ${event.preLad} · TOR ${event.preTor}`);
  text($('moment-outs'), outs);
  text($('moment-bases'), bases.join(' + ') || 'Empty');
  text($('moment-re24'), event.runRE24 === null ? 'Unavailable' : sign(event.runRE24));
  text($('moment-method'), event.runRE24 === null
    ? 'This moment shows the observed game state. The replay displays empirical RE24 for Toronto batting plays.'
    : 'RE24 combines the runs scored on the play with the change in average runs remaining from the starting and ending base-and-out states.');
  for (const base of [1, 2, 3]) $(`base${base}`).setAttribute('fill', event.bases & (1 << (base - 1)) ? '#e2bd79' : '#3f6078');
  $('base-diamond').setAttribute('aria-label', `Before the play, ${outs}. Bases occupied ${bases.join(' and ') || 'none'}.`);
  $('bichette-atlas').hidden = index !== 0;
  $('bunt-analysis-link').hidden = event.pn !== 98 && index !== buntIndex;
  gameButtons.forEach((button, i) => { button.setAttribute('aria-current', String(i === gameStep)); });
  renderGame();
}

function setGameMode(mode) {
  gameMode = mode;
  renderGame();
}

function renderGame() {
  const event = gameEvents[gameStep];
  const guided = !gameExplorer.open;
  const observed = gameMode === 'score';
  for (const button of gameGuideButtons) {
    button.setAttribute('aria-pressed', String(guided && Number(button.dataset.guidePlay) === event.pn));
  }
  text($('game-guide-caption'), guided ? gameGuideCopy[event.pn] : 'Choose a recorded play to see the score, outs and runners before it happened.');
  $('score-view').setAttribute('aria-pressed', String(observed));
  $('wp-view').setAttribute('aria-pressed', String(!observed));
  text($('game-chart-heading'), observed ? 'The score, inning by inning' : 'Estimated Toronto win probability');
  text($('game-chart-sub'), observed
    ? (guided ? `Score at the end of inning ${inningOf(event)}.` : `Full game. The highlight shows the score after inning ${inningOf(event)}.`)
    : 'Experimental estimates from a model trained on regular-season games. Postseason calibration remains pending.');
  text($('game-chart-note'), observed
    ? (guided ? 'The chart uses the MLB Gameday line score and advances with each guided moment.' : 'The MLB Gameday line score covers all eleven innings. The marker shows the inning of the selected play.')
    : 'The marked value is the model estimate after the selected play.');
  $('game-wp-help').hidden = observed;
  const methods = $('game-method-link');
  methods.href = observed ? '#method-game7' : '#method-model';
  text(methods, observed ? '[6] Game 7 replay sources' : '[7] Model sources and methods');
  drawGameChart();
}

function drawGameChart() {
  const event = gameEvents[gameStep];
  gameWidth = Math.max(220, gameChart.clientWidth);
  const score = gameMode === 'score';
  const height = (gameWidth < 475 ? 229 : 294) + (score ? 16 : 0);
  const svg = svgChart(gameWidth, height, score ? 'Game 7 cumulative scores by inning.' : 'Experimental Game 7 Toronto win probability trace.');
  gameChart.replaceChildren(svg);
  const left = score ? 34 : 43;
  const right = gameWidth - 17;
  const top = score ? 46 : 38;
  const bottom = height - 48;
  const x = fraction => left + (right - left) * fraction;
  const y = fraction => bottom - (bottom - top) * fraction;
  const range = score ? [0, 1, 2, 3, 4, 5] : [0, 25, 50, 75, 100];
  const max = range.at(-1);
  if (score) {
    const inning = inningOf(event);
    const from = x((inning - .5) / gameLength);
    const to = x(Math.min(1, (inning + .5) / gameLength));
    shape(svg, 'rect', {x: from, y: top, width: to - from, height: bottom - top, class: 'game-inning-band'});
  }
  for (const value of range) {
    const yy = y(value / max);
    shape(svg, 'line', {x1: left, x2: right, y1: yy, y2: yy, stroke: '#395772'});
    shape(svg, 'text', {x: left - 8, y: yy + 4, 'text-anchor': 'end', fill: '#c1d2df', 'font-size': 11}, score ? value : `${value}%`);
  }
  if (score) {
    drawScoreLines(svg, event, {x, y, left, right, top, bottom, height});
  } else {
    drawProbabilityLine(svg, event, {x, y, left, right, top, bottom, height});
  }
}

function drawScoreLines(svg, event, axes) {
  const {x, y, left, right, top, bottom, height} = axes;
  const inning = inningOf(event);
  const through = gameExplorer.open ? gameLength : inning;
  const inningX = x(inning / gameLength);
  shape(svg, 'line', {x1: inningX, x2: inningX, y1: top, y2: bottom, class: 'game-inning-marker'});
  for (let index = 1; index <= gameLength; index++) {
    const labelClass = index === inning ? 'game-inning-tick current' : index <= through ? 'game-inning-tick' : 'game-inning-tick later';
    shape(svg, 'text', {x: x(index / gameLength), y: bottom + 19, 'text-anchor': 'middle', class: labelClass}, index);
  }
  const teams = [
    {name: 'TOR', runs: DATA.innings.tor, color: '#80c5f8'},
    {name: 'LAD', runs: DATA.innings.lad, color: '#f19c88', dash: '6 3'},
  ];
  const totals = teams.map(team => team.runs.slice(0, inning).reduce((sum, runs) => sum + runs, 0));
  for (const [index, team] of teams.entries()) {
    let total = 0;
    let path = `M ${x(0)} ${y(0)}`;
    for (const [i, runs] of team.runs.slice(0, through).entries()) {
      total += runs;
      path += ` H ${x((i + 1) / gameLength)} V ${y(total / 5)}`;
    }
    const style = {d: path, fill: 'none', stroke: team.color, 'stroke-width': index === 0 ? 3.6 : 3, 'stroke-linejoin': 'round'};
    if (team.dash) style['stroke-dasharray'] = team.dash;
    shape(svg, 'path', style);
    const legendX = left + index * 83;
    const key = {x1: legendX, x2: legendX + 14, y1: 18, y2: 18, stroke: team.color, 'stroke-width': 2.6};
    if (team.dash) key['stroke-dasharray'] = team.dash;
    shape(svg, 'line', key);
    shape(svg, 'text', {x: legendX + 20, y: 23, fill: team.color, class: 'game-score-label'}, `${team.name} ${totals[index]}`);
  }
  for (const [index, team] of teams.entries()) {
    const inner = index === 1 && totals[0] === totals[1];
    shape(svg, 'circle', {cx: inningX, cy: y(totals[index] / 5), r: inner ? 3.1 : 6.1, fill: team.color, stroke: '#0b2032', 'stroke-width': inner ? 0 : 1.5});
  }
  svg.setAttribute('aria-label', `Game 7 score at the end of inning ${inning}. Toronto ${totals[0]}, Los Angeles ${totals[1]}.`);
  shape(svg, 'text', {x: (left + right) / 2, y: height - 5, 'text-anchor': 'middle', fill: '#c1d2df', 'font-size': 11}, 'Inning');
}

function drawProbabilityLine(svg, event, axes) {
  const {x, y, left, right, top, bottom, height} = axes;
  const trace = DATA.winprob;
  const last = trace.at(-1).pn;
  const playX = number => x((number - 1) / (last - 1));
  const shown = gameExplorer.open ? trace : trace.filter(play => play.pn <= event.pn);
  const points = shown.map(play => `${playX(play.pn).toFixed(1)},${y(play.prob).toFixed(1)}`);
  shape(svg, 'path', {d: `M ${points.join(' L ')}`, stroke: '#80c5f8', 'stroke-width': 2.6, fill: 'none'});
  const mark = trace.find(play => play.pn === event.pn);
  const eventX = playX(mark.pn);
  shape(svg, 'line', {x1: eventX, x2: eventX, y1: top, y2: bottom, stroke: '#dec489', 'stroke-dasharray': '4 3'});
  shape(svg, 'circle', {cx: eventX, cy: y(mark.prob), r: 5, fill: '#dec489'});
  const value = `${Math.round(mark.prob * 100)}% estimated after this play`;
  svg.setAttribute('aria-label', `Experimental Game 7 win probability. ${event.title}. ${value}.`);
  shape(svg, 'text', {x: right, y: 18, 'text-anchor': 'end', fill: '#f3d8a6', 'font-size': 12}, value);
  shape(svg, 'text', {x: (left + right) / 2, y: height - 5, 'text-anchor': 'middle', fill: '#c1d2df', 'font-size': 11}, 'Recorded plays');
}

$('score-view').addEventListener('click', () => setGameMode('score'));
$('wp-view').addEventListener('click', () => setGameMode('wp'));
for (const button of gameGuideButtons) {
  button.addEventListener('click', () => {
    gameExplorer.open = false;
    selectMoment(gameEvents.findIndex(event => event.pn === Number(button.dataset.guidePlay)));
  });
}
gameExplorer.addEventListener('toggle', () => {
  if (gameExplorer.open) renderGame();
  else selectMoment(lastGuidedStep);
});
for (const link of document.querySelectorAll('[data-show-bunt]')) {
  link.addEventListener('click', () => {
    gameExplorer.open = true;
    selectMoment(buntIndex);
  });
}
text($('bunt-re24'), sign(gameEvents[buntIndex].runRE24));
selectMoment(gameStep);
new ResizeObserver(() => {
  if (gameChart.clientWidth && gameChart.clientWidth !== gameWidth) drawGameChart();
}).observe(gameChart);
