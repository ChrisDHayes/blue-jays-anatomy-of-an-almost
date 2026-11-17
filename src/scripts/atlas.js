const atlasSources = {guru: 'February Guru forecast', zips: 'archived ZiPS sample', steamer: 'archived Steamer sample'};
const atlasSourceNames = {guru: 'Guru · February', zips: 'ZiPS · archived', steamer: 'Steamer · archived'};
const atlasStages = [
  {title: 'The expectation line', subtitle: 'Each dot is a hitter. Pick one to see his profile and how far he finished from his forecast.'},
  {title: 'The size of the surprise', subtitle: 'From the biggest improvement over forecast to the biggest shortfall. Select a bar for the hitter’s profile.'},
  {title: 'How the hitting translated into runs', subtitle: 'The horizontal axis shows the slugging gap. The vertical axis shows batting RE24 per 100 plate appearances.'},
];
let stage = 0;
let forecast = 'guru';
let selected = 'George Springer';
let widthDrawn = 0;
let restoreProfileFocus;

const atlasChart = $('atlas-chart');
const atlasFeature = $('atlas-feature');
const cohortControl = $('cohort');
const profile = $('player-dialog');
const sheet = $('profile-sheet');
const dock = $('profile-dock');
const narrowProfile = matchMedia('(max-width: 1050px)');
const stageButtons = [...document.querySelectorAll('[data-stage]')];
const beatLinks = [...document.querySelectorAll('[data-stage-jump]')];
const featured = [...document.querySelectorAll('[data-atlas-player]')];
const eligible = () => {
  const minimum = Number(cohortControl.value);
  return DATA.players.filter(player => Number.isFinite(player[forecast]) && player.pa >= minimum);
};
const formatInteger = new Intl.NumberFormat('en-CA');

function profileContent(destination, titleId) {
  destination.append($('player-profile-template').content.cloneNode(true));
  destination.querySelector('[data-player-name]').id = titleId;
}

function profileRow(body, label, value, definition) {
  const row = document.createElement('div');
  const title = document.createElement('dt');
  const metric = document.createElement('dd');
  const term = document.createElement('button');
  term.type = 'button';
  term.className = 'metric-term';
  term.dataset.metric = definition;
  term.setAttribute('aria-describedby', `def-${definition}`);
  text(term, label);
  title.append(term);
  text(metric, value);
  row.append(title, metric);
  body.append(row);
}

function renderProfile(destination, player, roster) {
  const gap = player.actual - player[forecast];
  const rank = 1 + roster.filter(other => other.actual - other[forecast] > gap).length;
  const place = forecast === 'guru' ? player.projectedPA : player[forecast + 'PA'];
  const cells = {
    'player-name': player.name,
    'player-source': atlasSourceNames[forecast],
    'profile-projection': slug(player[forecast]),
    'profile-actual': slug(player.actual),
    'profile-gap': slugGap(gap),
    'profile-rank': `No. ${rank} of ${roster.length} shown by slugging gap`,
  };
  for (const [key, value] of Object.entries(cells)) text(destination.querySelector(`[data-${key}]`), value);
  destination.querySelector('[data-profile-gap]').dataset.direction = gap >= 0 ? 'positive' : 'negative';

  const totalBases = Math.round(player.actual * player.ab);
  const playingTime = `${formatInteger.format(player.pa)} actual · ${formatInteger.format(Math.round(place))} projected`;
  const runContext = Number.isFinite(player.re24) ? `${sign(player.re24, 1)} runs` : 'Unavailable';
  const runRate = Number.isFinite(player.rePer100) ? sign(player.rePer100, 2) : 'Unavailable';
  const stats = destination.querySelector('[data-profile-stats]');
  stats.replaceChildren();
  for (const [label, value, definition] of [
    ['Plate appearances', playingTime, 'pa'],
    ['At-bats · total bases', `${player.ab} · ${totalBases}`, 'bases'],
    ['Batting RE24', runContext, 're24'],
    ['RE24 per 100 PA', runRate, 're24-rate'],
  ]) profileRow(stats, label, value, definition);
  if (forecast === 'guru') profileRow(stats, 'Extra total bases at actual AB', sign(player.tbSurplus, 1), 'extra-bases');

  const table = destination.querySelector('[data-profile-forecasts]');
  table.replaceChildren();
  for (const source of Object.keys(atlasSources)) {
    const row = table.insertRow();
    row.classList.toggle('active', source === forecast);
    const projected = player[source];
    const hasMatch = Number.isFinite(projected);
    const name = document.createElement('th');
    name.scope = 'row';
    text(name, atlasSourceNames[source]);
    row.append(name);
    text(row.insertCell(), hasMatch ? slug(projected) : '—');
    text(row.insertCell(), hasMatch ? slugGap(player.actual - projected) : '—');
  }
}

function currentMark(name) {
  return atlasChart.querySelector(`[data-chart-player="${CSS.escape(name)}"]`);
}

function currentTableButton(name) {
  return $('data-table').querySelector(`[data-table-player="${CSS.escape(name)}"]`);
}

function drawChart(roster) {
  const focusedPlayer = document.activeElement?.dataset.chartPlayer;
  const width = Math.max(238, atlasChart.clientWidth);
  widthDrawn = width;
  const height = stage === 1 ? Math.max(160, roster.length * 24 + 26) : (width > 560 ? 327 : Math.max(267, Math.round(width * .69)));
  const svg = svgChart(width, height, atlasStages[stage].title, 'group');
  atlasChart.dataset.view = stage === 1 ? 'rank' : 'scatter';
  atlasChart.replaceChildren(svg);
  if (stage === 1) drawAtlasRanking(svg, width, height, roster, forecast, selected);
  else drawAtlasScatter(svg, width, height, roster, forecast, selected, stage === 2);
  if (focusedPlayer) (currentMark(selected) || currentMark(focusedPlayer))?.focus({preventScroll: true});
}

function renderAtlas() {
  const roster = eligible();
  const focusedTableRow = document.activeElement?.dataset.tablePlayer;
  const player = roster.find(hitter => hitter.name === selected) ?? roster[0];
  selected = player.name;
  const {title, subtitle} = atlasStages[stage];
  text($('atlas-title'), title);
  text($('atlas-subtitle'), subtitle);
  text($('atlas-narration'), atlasFeature.querySelector(`[data-story-step="${stage}"] h3 + p`).textContent);
  for (const button of stageButtons) button.setAttribute('aria-pressed', String(Number(button.dataset.stage) === stage));
  for (const beat of atlasFeature.querySelectorAll('[data-story-step]')) beat.dataset.active = String(Number(beat.dataset.storyStep) === stage);
  for (const button of featured) {
    if (button instanceof HTMLButtonElement) button.setAttribute('aria-pressed', String(button.dataset.atlasPlayer === selected));
  }

  drawChart(roster);
  drawTable(roster);
  drawAtlasLegend();
  renderProfile(dock, player, roster);
  renderProfile(sheet, player, roster);
  const picker = $('player-picker');
  picker.replaceChildren(...roster.map(hitter => new Option(hitter.name, hitter.name)));
  picker.value = selected;
  $('profile-open').setAttribute('aria-label', `Open profile for ${selected}`);
  if (focusedTableRow) currentTableButton(selected)?.focus({preventScroll: true});

  const shown = stage === 2 ? roster.filter(hitter => Number.isFinite(hitter.rePer100)).length : roster.length;
  text($('atlas-readout'), `${shown} of ${DATA.players.length} hitters shown · ${atlasSources[forecast]}`);
  text($('season-handoff'), `From the Atlas · ${player.name} slugged ${slug(player.actual)} against ${slug(player[forecast])} in the ${atlasSources[forecast]}.`);
}

function drawAtlasLegend() {
  const items = stage === 2
    ? [['Hitter', 'neutral'], ['Selected hitter', 'blue'], ['Forecast parity and zero RE24', 'line']]
    : [['At or above forecast', 'good'], ['Below forecast', 'bad'], [stage === 0 ? 'Matched forecast' : 'Zero gap', 'line'], ['Selected hitter', 'blue']];
  const legend = $('atlas-legend');
  legend.replaceChildren();
  for (const [label, colour] of items) {
    const item = document.createElement('span');
    const key = document.createElement('i');
    item.className = 'legenditem';
    key.className = colour === 'line' ? 'legend-line' : `legend-dot ${colour}`;
    key.setAttribute('aria-hidden', 'true');
    item.append(key, document.createTextNode(label));
    legend.append(item);
  }
}

function showProfile(trigger) {
  if (!narrowProfile.matches || profile.open) return;
  restoreProfileFocus = trigger;
  profile.showModal();
  profile.scrollTop = 0;
}

function selectPlayer(name, {inspect = false, fromChart = false, trigger = document.activeElement} = {}) {
  selected = name;
  renderAtlas();
  const player = eligible().find(hitter => hitter.name === selected);
  if (inspect && narrowProfile.matches) showProfile(fromChart ? currentMark(selected) : trigger);
  else text($('atlas-announcer'), `${player.name}. Actual slugging ${slug(player.actual)}. Forecast ${slug(player[forecast])}. Profile updated.`);
}

function attachPoint(mark, player) {
  const current = player.name === selected;
  mark.setAttribute('tabindex', current ? '0' : '-1');
  mark.setAttribute('role', 'button');
  mark.setAttribute('aria-pressed', String(current));
  mark.setAttribute('aria-controls', narrowProfile.matches ? 'player-dialog' : 'profile-dock');
  if (narrowProfile.matches) mark.setAttribute('aria-haspopup', 'dialog');
  mark.setAttribute('aria-label', `${player.name} · Projected slugging ${slug(player[forecast])} · Actual slugging ${slug(player.actual)}`);
  mark.dataset.chartPlayer = player.name;
  mark.addEventListener('click', () => selectPlayer(player.name, {inspect: true, fromChart: true}));
  mark.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectPlayer(player.name, {inspect: true, fromChart: true});
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const marks = [...atlasChart.querySelectorAll('[data-chart-player]')];
    const index = marks.indexOf(mark);
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const next = event.key === 'Home' ? marks[0] : event.key === 'End' ? marks.at(-1) : marks[(index + direction + marks.length) % marks.length];
    for (const point of marks) point.setAttribute('tabindex', point === next ? '0' : '-1');
    next.focus();
  });
}

function drawTable(roster) {
  const table = document.createElement('table');
  const header = table.createTHead().insertRow();
  for (const label of ['Hitter', 'Forecast SLG', 'Actual SLG', 'Δ SLG', 'PA', 'RE24/100 PA']) {
    const heading = document.createElement('th');
    heading.scope = 'col';
    text(heading, label);
    header.append(heading);
  }
  const body = table.createTBody();
  const ordered = [...roster].sort((a, b) => (b.actual - b[forecast]) - (a.actual - a[forecast]));
  for (const player of ordered) {
    const row = body.insertRow();
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.tablePlayer = player.name;
    button.setAttribute('aria-pressed', String(player.name === selected));
    button.setAttribute('aria-controls', narrowProfile.matches ? 'player-dialog' : 'profile-dock');
    if (narrowProfile.matches) button.setAttribute('aria-haspopup', 'dialog');
    text(button, player.name);
    button.addEventListener('click', () => {
      selectPlayer(player.name);
      showProfile(currentTableButton(player.name));
    });
    row.insertCell().append(button);
    const values = [slug(player[forecast]), slug(player.actual), slugGap(player.actual - player[forecast]), player.pa, player.rePer100 === null ? '—' : sign(player.rePer100, 2)];
    for (const value of values) text(row.insertCell(), value);
  }
  $('data-table').replaceChildren(table);
}

function setAtlasStage(value) {
  if (stage === Number(value)) return;
  stage = Number(value);
  renderAtlas();
}

profileContent(dock, 'selected-name');
profileContent(sheet, 'mobile-player-name');
for (const button of stageButtons) button.addEventListener('click', () => setAtlasStage(button.dataset.stage));
for (const link of beatLinks) link.addEventListener('click', event => {
  if (atlasFeature.dataset.pinned === 'true') event.preventDefault();
  setAtlasStage(link.dataset.stageJump);
});
for (const control of featured) control.addEventListener('click', () => selectPlayer(control.dataset.atlasPlayer, {inspect: control instanceof HTMLButtonElement, trigger: control}));
atlasFeature.addEventListener('story-step', event => setAtlasStage(event.detail));
$('forecast').addEventListener('change', event => { forecast = event.target.value; renderAtlas(); });
cohortControl.addEventListener('change', renderAtlas);
$('player-picker').addEventListener('change', event => selectPlayer(event.target.value, {inspect: true, trigger: $('player-picker')}));
$('profile-open').addEventListener('click', event => showProfile(event.currentTarget));
$('profile-dismiss').addEventListener('click', () => profile.close());
profile.addEventListener('close', () => {
  const target = restoreProfileFocus?.isConnected && restoreProfileFocus.getClientRects().length
    ? restoreProfileFocus : currentMark(selected);
  restoreProfileFocus = undefined;
  target?.focus({preventScroll: true});
});
narrowProfile.addEventListener('change', () => {
  if (!narrowProfile.matches && profile.open) profile.close();
  renderAtlas();
});

renderAtlas();
new ResizeObserver(() => {
  if (atlasChart.clientWidth && atlasChart.clientWidth !== widthDrawn) drawChart(eligible());
}).observe(atlasChart);
