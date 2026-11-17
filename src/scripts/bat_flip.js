const batFlipData = JSON.parse($('bat-flip-json').textContent);
const batFlipChart = $('bat-flip-chart');
const batFlipButtons = [...document.querySelectorAll('[data-bat-play]')];
const batFlipPoints = [{inning: 0, tor: 0, tex: 0}];
let batFlipSelected = 'bautista';
let batFlipWidth = 0;

function addBatFlipPoint(inning, runs, play) {
  const previous = batFlipPoints.at(-1);
  batFlipPoints.push({inning, tor: previous.tor + runs.tor, tex: previous.tex + runs.tex, play});
}

for (const [index, tor] of batFlipData.innings.tor.entries()) {
  const inning = index + 1;
  if (inning === 7) {
    for (const play of batFlipData.seventh) addBatFlipPoint(inning, play, play.id);
  } else {
    addBatFlipPoint(inning, {tor: tor ?? 0, tex: batFlipData.innings.tex[index]});
  }
}

function drawBatFlipChart() {
  const width = Math.max(220, batFlipChart.clientWidth);
  batFlipWidth = width;
  const height = width < 450 ? 244 : 292;
  const left = 30;
  const right = width - 20;
  const top = 38;
  const bottom = height - 32;
  const x = index => left + (right - left) * index / (batFlipPoints.length - 1);
  const y = runs => bottom - (bottom - top) * runs / 6;
  const current = batFlipPoints.findIndex(point => point.play === batFlipSelected);
  const seventh = batFlipPoints.findIndex(point => point.inning === 7);
  const state = batFlipPoints[current];
  const label = `2015 ALDS Game 5 cumulative score. Selected play: Toronto ${state.tor}, Texas ${state.tex}. Final: Toronto 6, Texas 3.`;
  const svg = svgChart(width, height, label);
  batFlipChart.replaceChildren(svg);
  shape(svg, 'rect', {x: x(seventh - .5), y: top - 7, width: x(seventh + 2.5) - x(seventh - .5), height: bottom - top + 7, rx: 2, class: 'bat-flip-inning-band'});
  for (const runs of [0, 2, 4, 6]) {
    shape(svg, 'line', {x1: left, x2: right, y1: y(runs), y2: y(runs), stroke: '#d5d6d1'});
    shape(svg, 'text', {x: left - 8, y: y(runs) + 4, 'text-anchor': 'end', fill: '#435b6d', 'font-size': 11}, runs);
  }
  for (const [index, label] of [[1, '1st'], [3, '3rd'], [6, '6th'], [seventh + 1, '7th'], [batFlipPoints.length - 1, 'Final']]) {
    shape(svg, 'text', {x: x(index), y: bottom + 19, 'text-anchor': 'middle', fill: '#435b6d', 'font-size': 11, 'font-weight': label === '7th' ? 750 : 500}, label);
  }
  shape(svg, 'line', {x1: x(current), x2: x(current), y1: top - 6, y2: bottom, stroke: '#607a91', 'stroke-dasharray': '3 4'});
  const teams = [
    {field: 'tor', label: 'Toronto', color: '#205b93'},
    {field: 'tex', label: 'Texas', color: '#a35240', dash: '5 4'},
  ];
  for (const [teamIndex, team] of teams.entries()) {
    const path = batFlipPoints.slice(1).reduce((line, point, index) => `${line} H ${x(index + 1)} V ${y(point[team.field])}`, `M ${x(0)} ${y(0)}`);
    const style = {d: path, fill: 'none', stroke: team.color, 'stroke-width': teamIndex === 0 ? 3.6 : 3, 'stroke-linejoin': 'round'};
    if (team.dash) style['stroke-dasharray'] = team.dash;
    shape(svg, 'path', style);
    const legendX = left + teamIndex * 104;
    const legend = {x1: legendX, x2: legendX + 14, y1: 15, y2: 15, stroke: team.color, 'stroke-width': 2.4};
    if (team.dash) legend['stroke-dasharray'] = team.dash;
    shape(svg, 'line', legend);
    shape(svg, 'text', {x: legendX + 19, y: 19, fill: team.color, class: 'bat-flip-chart-score'}, `${team.label} ${state[team.field]}`);
  }
  for (const team of teams) {
    const inner = team.field === 'tex' && state.tor === state.tex;
    shape(svg, 'circle', {cx: x(current), cy: y(state[team.field]), r: inner ? 3.1 : 6.1, fill: team.color, stroke: '#fffaf2', 'stroke-width': inner ? 0 : 1.4});
  }
}

function selectBatFlipPlay(id) {
  batFlipSelected = id;
  const play = batFlipData.seventh.find(event => event.id === id);
  const score = batFlipPoints.find(point => point.play === id);
  for (const button of batFlipButtons) button.setAttribute('aria-pressed', String(button.dataset.batPlay === id));
  text($('bat-flip-half'), play.half);
  text($('bat-flip-event-title'), play.title);
  text($('bat-flip-score'), `TOR ${score.tor} · TEX ${score.tex}`);
  text($('bat-flip-description'), play.description);
  $('bat-flip-clip').hidden = id !== 'bautista';
  drawBatFlipChart();
}

for (const button of batFlipButtons) button.addEventListener('click', () => selectBatFlipPlay(button.dataset.batPlay));
selectBatFlipPlay(batFlipSelected);
new ResizeObserver(() => {
  if (batFlipChart.clientWidth && batFlipChart.clientWidth !== batFlipWidth) drawBatFlipChart();
}).observe(batFlipChart);
