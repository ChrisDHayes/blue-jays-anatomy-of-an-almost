const DATA = JSON.parse(document.getElementById('evidence-json').textContent);
const $ = id => document.getElementById(id);
const svgNS = 'http://www.w3.org/2000/svg';
const text = (element, value) => { element.textContent = value; };
const sign = (value, places = 3) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(places)}`;
const slug = value => value.toFixed(3).replace(/^0\./, '.');
const slugGap = value => sign(value).replace(/0\./, '.');

function node(tag, attributes = {}, value) {
  const element = document.createElementNS(svgNS, tag);
  for (const [key, entry] of Object.entries(attributes)) element.setAttribute(key, entry);
  if (value !== undefined) text(element, value);
  return element;
}

function shape(parent, tag, attributes, value) {
  const element = node(tag, attributes, value);
  parent.append(element);
  return element;
}

function svgChart(width, height, label, role = 'img') {
  return node('svg', {viewBox: `0 0 ${width} ${height}`, role, 'aria-label': label});
}

function atlasAxes(svg, {width, height, xRange, yRange, xTicks, yTicks, xTitle, yTitle, xLabel, yLabel, showForecastRegions}) {
  const left = 41;
  const right = width - 19;
  const top = 22;
  const bottom = height - 44;
  const x = value => left + (value - xRange[0]) * (right - left) / (xRange[1] - xRange[0]);
  const y = value => bottom - (value - yRange[0]) * (bottom - top) / (yRange[1] - yRange[0]);
  if (showForecastRegions) {
    shape(svg, 'path', {d: `M ${left} ${bottom} V ${top} H ${right} Z`, class: 'atlas-region-above'});
    shape(svg, 'path', {d: `M ${left} ${bottom} H ${right} V ${top} Z`, class: 'atlas-region-below'});
  }
  for (const tick of xTicks) {
    const xx = x(tick);
    shape(svg, 'line', {x1: xx, x2: xx, y1: top, y2: bottom, class: 'plot-grid'});
    shape(svg, 'text', {x: xx, y: bottom + 17, 'text-anchor': 'middle', class: 'plot-tick'}, xLabel(tick));
  }
  for (const tick of yTicks) {
    const yy = y(tick);
    shape(svg, 'line', {x1: left, x2: right, y1: yy, y2: yy, class: 'plot-grid'});
    shape(svg, 'text', {x: left - 7, y: yy + 4, 'text-anchor': 'end', class: 'plot-tick'}, yLabel(tick));
  }
  shape(svg, 'path', {d: `M ${left} ${top} V ${bottom} H ${right}`, class: 'plot-axis'});
  shape(svg, 'text', {x: left, y: 13, class: 'plot-axis-label'}, yTitle);
  shape(svg, 'text', {x: (left + right) / 2, y: height - 6, 'text-anchor': 'middle', class: 'plot-axis-label'}, xTitle);
  return {x, y, top, bottom, left, right};
}

function drawAtlasScatter(svg, width, height, players, forecast, selected, drawContext) {
  const rateTicks = [.20, .30, .40, .50, .60];
  const minGap = Math.min(-.20, ...players.map(p => p.actual - p[forecast]));
  const maxGap = Math.max(.20, ...players.map(p => p.actual - p[forecast]));
  const limit = Math.ceil(Math.max(Math.abs(minGap), maxGap) * 20) / 20;
  const withRuns = players.filter(player => Number.isFinite(player.rePer100));
  const low = Math.floor(Math.min(-4, ...withRuns.map(player => player.rePer100)) / 4) * 4;
  const high = Math.ceil(Math.max(4, ...withRuns.map(player => player.rePer100)) / 4) * 4;
  const config = drawContext
    ? {xRange: [-limit, limit], yRange: [low, high], xTicks: [-.2, -.1, 0, .1, .2], yTicks: [low, 0, high],
       xTitle: 'Actual − projected SLG', yTitle: 'Batting RE24 per 100 PA',
       xLabel: value => value === 0 ? '0' : sign(value, 2), yLabel: String}
    : {xRange: [.15, .60], yRange: [.15, .60], xTicks: rateTicks, yTicks: rateTicks,
       xTitle: 'Projected slugging', yTitle: 'Actual slugging', xLabel: value => slug(value).slice(0, 3), yLabel: value => slug(value).slice(0, 3)};
  const grid = shape(svg, 'g', {'aria-hidden': 'true'});
  const axes = atlasAxes(grid, {width, height, ...config, showForecastRegions: !drawContext});
  const {x, y, left, right, top, bottom} = axes;
  if (drawContext) {
    shape(grid, 'path', {d: `M ${x(0)} ${top} V ${bottom} M ${left} ${y(0)} H ${right}`, class: 'plot-reference'});
  } else {
    shape(grid, 'line', {x1: x(.15), x2: x(.60), y1: y(.15), y2: y(.60), class: 'plot-reference'});
    shape(grid, 'text', {x: left + 8, y: top + 17, class: 'atlas-region-label above'}, 'Above forecast');
    shape(grid, 'text', {x: right - 8, y: bottom - 8, 'text-anchor': 'end', class: 'atlas-region-label below'}, 'Below forecast');
  }
  const ordered = drawContext ? withRuns : [...players];
  ordered.sort((a, b) => Number(a.name === selected) - Number(b.name === selected));
  const coordinates = ordered.map(player => ({player,
    x: x(drawContext ? player.actual - player[forecast] : player[forecast]),
    y: y(drawContext ? player.rePer100 : player.actual),
  }));
  const annotations = shape(svg, 'g', {'aria-hidden': 'true'});
  const marks = shape(svg, 'g', {role: 'group', 'aria-label': 'Hitters'});
  const compact = width < 410;
  for (const point of coordinates) {
    const {player, x: px, y: py} = point;
    const current = player.name === selected;
    const colour = drawContext ? 'neutral' : player.actual >= player[forecast] ? 'above' : 'below';
    const item = shape(marks, 'g', {class: `atlas-mark ${colour}${current ? ' is-selected' : ''}`});
    const radius = (compact ? 4 : 4.5) + Number(current);
    shape(item, 'circle', {cx: px, cy: py, r: radius, class: 'atlas-dot'});
    shape(item, 'title', {}, player.name);
    attachPoint(item, player);
    if (current) {
      if (!drawContext) {
        const forecastY = y(player[forecast]);
        shape(annotations, 'line', {x1: px, x2: px, y1: forecastY, y2: py, class: 'atlas-gap-guide'});
        shape(annotations, 'circle', {cx: px, cy: forecastY, r: 3.2, class: 'atlas-gap-origin'});
      }
      shape(annotations, 'circle', {cx: px, cy: py, r: radius + 3, class: 'atlas-dot-ring'});
      if (!compact) {
        const toLeft = px > (left + right) / 2;
        const labelY = py < top + 18 ? py + 21 : py - 13;
        const label = drawContext ? player.name : `${player.name} ${slugGap(player.actual - player[forecast])}`;
        shape(annotations, 'text', {x: px + (toLeft ? -10 : 10), y: labelY, 'text-anchor': toLeft ? 'end' : 'start',
          class: 'atlas-plot-name'}, label);
      }
    }
  }
  svg.addEventListener('click', event => {
    if (event.target.closest('[data-chart-player]')) return;
    const bounds = svg.getBoundingClientRect();
    const px = (event.clientX - bounds.left) * width / bounds.width;
    const py = (event.clientY - bounds.top) * height / bounds.height;
    const nearest = coordinates.reduce((best, point) => {
      const distance = Math.hypot(point.x - px, point.y - py);
      return distance < best.distance ? {distance, player: point.player} : best;
    }, {distance: 17, player: null});
    if (nearest.player) selectPlayer(nearest.player.name, {inspect: true, fromChart: true});
  });
}

function drawAtlasRanking(svg, width, height, players, forecast, selected) {
  const ranked = [...players].sort((a, b) => (b.actual - b[forecast]) - (a.actual - a[forecast]));
  const left = Math.min(160, width * .40);
  const right = width - 41;
  const limit = Math.max(.22, ...players.map(player => Math.abs(player.actual - player[forecast])));
  const x = value => left + (value + limit) * (right - left) / (2 * limit);
  const zero = x(0);
  const top = 30;
  shape(svg, 'text', {x: left, y: 13, class: 'plot-axis-label'}, 'Actual − projected SLG');
  shape(svg, 'line', {x1: zero, x2: zero, y1: top - 6, y2: height - 7, class: 'plot-reference'});
  for (const [index, player] of ranked.entries()) {
    const gap = player.actual - player[forecast];
    const y = top + index * 24;
    const current = player.name === selected;
    const colour = gap >= 0 ? 'above' : 'below';
    const label = width < 405 ? player.name.replace(/^([^\s])[^\s]*\s/, '$1. ') : player.name;
    const item = shape(svg, 'g', {class: `atlas-mark ${colour}${current ? ' is-selected' : ''}`});
    shape(item, 'rect', {x: 1, y: y - 4, width: width - 2, height: 22, class: 'atlas-row-hit'});
    shape(item, 'text', {x: 4, y: y + 11, class: 'atlas-bar-name'}, label);
    shape(item, 'rect', {x: Math.min(zero, x(gap)), y, width: Math.max(2, Math.abs(x(gap) - zero)), height: 13, rx: 2, class: 'atlas-dot'});
    shape(item, 'text', {x: width - 4, y: y + 11, 'text-anchor': 'end', class: 'atlas-bar-value'}, slugGap(gap));
    attachPoint(item, player);
  }
}
