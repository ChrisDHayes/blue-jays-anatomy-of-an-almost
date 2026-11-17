(() => {
  const exhibit = $('tracking-exhibit');
  const fileInput = $('tracking-file');
  const status = $('tracking-status');
  const typeFilter = $('tracking-type');
  const colourFilter = $('tracking-colour');
  const modeButtons = [...exhibit.querySelectorAll('[data-tracking-mode]')];
  const pitchers = {TOR: $('tracking-tor'), OPP: $('tracking-opp')};
  const plots = {TOR: $('tracking-plot-tor'), OPP: $('tracking-plot-opp')};
  const gameKeys = new Set(
    ['NYY', 'SEA', 'LAD'].flatMap(team => POSTSEASON_OUTS[team].dates.map(date => `${date}/${team}`)),
  );
  const columns = [
    'game_pk', 'game_date', 'home_team', 'away_team', 'inning_topbot', 'at_bat_number', 'pitch_number',
    'pitcher', 'player_name', 'pitch_type', 'release_speed', 'plate_x', 'plate_z', 'sz_top', 'sz_bot',
  ];
  const colours = ['#195e93', '#ba632b', '#12756b', '#7a4b96', '#a02f4c', '#866418', '#227b9e', '#55712e',
    '#4e5c73', '#a35b6a', '#1c5b57', '#95664f'];
  const viewSize = 320, margin = 24, gridSize = 9;
  const cellSize = (viewSize - 2 * margin) / gridSize;
  const zoneHalfWidth = 17 / 24;
  const heatHalfWidth = 3 * zoneHalfWidth, heatLow = -1, heatHigh = 2;
  const rows = ['Well above the zone', 'Above the zone', 'Just above the zone', 'Upper third', 'Middle third',
    'Lower third', 'Just below the zone', 'Below the zone', 'Well below the zone'];
  const columnsFromCatcher = ['far left', 'left of the plate', 'just left of the plate', 'left third',
    'centre', 'right third', 'just right of the plate', 'right of the plate', 'far right'];
  let series = 'all';
  let mode = 'heatmap';
  let records = [];
  let coverage = new Set();
  let domain;
  let palette = new Map();
  let latestImport = 0;

  function parseCsv(source) {
    const rows = [];
    let row = [], value = '', quoted = false;
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (char === '"') {
        if (quoted && source[i + 1] === '"') {
          value += char;
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
        row.push(value);
        value = '';
        if (char !== ',') {
          if (row.some(Boolean)) rows.push(row);
          row = [];
        }
      } else {
        value += char;
      }
    }
    if (quoted) throw new Error('The CSV ends inside a quoted field.');
    if (value || row.length) rows.push([...row, value]);
    return rows;
  }

  const number = (value) => value?.trim() ? Number(value) : NaN;

  function displayName(value) {
    const parts = value.split(',').map(part => part.trim());
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : value;
  }

  function importPitches(source) {
    const [headers, ...rows] = parseCsv(source.replace(/^\uFEFF/, ''));
    if (!headers) throw new Error('The CSV contains no records.');
    const index = new Map(headers.map((header, i) => [header.trim(), i]));
    const missing = columns.filter(column => !index.has(column));
    if (missing.length) throw new Error(`Choose a pitch-level Statcast CSV. Missing fields include ${missing.slice(0, 4).join(', ')}.`);
    const seenPitches = new Set();
    const sidesByGame = new Map();
    const valid = [];
    for (const row of rows) {
      const get = field => row[index.get(field)]?.trim() || '';
      const home = get('home_team');
      const away = get('away_team');
      if ((home === 'TOR') === (away === 'TOR')) continue;
      const other = home === 'TOR' ? away : home;
      const date = get('game_date');
      const game = `${date}/${other}`;
      if (!gameKeys.has(game)) continue;
      const half = get('inning_topbot').toLowerCase();
      if (!['top', 'bot', 'bottom'].includes(half)) continue;
      const team = half === 'top' ? home : away;
      const x = number(get('plate_x')), z = number(get('plate_z'));
      const low = number(get('sz_bot')), high = number(get('sz_top'));
      const speed = number(get('release_speed'));
      const type = get('pitch_name') || get('pitch_type');
      const player = get('player_name'), playerId = get('pitcher');
      if (![x, z, low, high, speed].every(Number.isFinite) || high <= low || speed <= 0 || !type || !player || !playerId) continue;
      const y = (z - low) / (high - low);
      if (!Number.isFinite(y)) continue;
      const identity = [get('game_pk'), get('at_bat_number'), get('pitch_number')];
      if (!identity.every(Boolean)) continue;
      const key = identity.join('/');
      if (seenPitches.has(key)) continue;
      seenPitches.add(key);
      valid.push({game, date, other, team, player: displayName(player), playerId, type, speed, x, z, y});
      if (!sidesByGame.has(game)) sidesByGame.set(game, new Set());
      sidesByGame.get(game).add(team);
    }
    const paired = new Set([...sidesByGame].filter(([, teams]) => teams.size === 2).map(([game]) => game));
    if (!paired.size) throw new Error('The file needs tracked pitches from both sides of at least one Toronto playoff game.');
    return {paired, pitches: valid.filter(pitch => paired.has(pitch.game))};
  }

  function setOptions(select, first, options) {
    const previous = select.value;
    select.replaceChildren(new Option(first, ''), ...options.map(([key, label]) => new Option(label, key)));
    if (options.some(([key]) => key === previous)) select.value = previous;
  }

  const inSeries = pitch => series === 'all' || pitch.other === series;

  function speedColour(speed) {
    const share = (speed - domain.lowSpeed) / (domain.highSpeed - domain.lowSpeed || 1);
    return `hsl(${211 - share * 193} 62% 41%)`;
  }

  function drawPitchLegend(filtered) {
    const entries = colourFilter.value === 'speed'
      ? [domain.lowSpeed, (domain.lowSpeed + domain.highSpeed) / 2, domain.highSpeed].map(speed => [`${speed.toFixed(1)} mph`, speedColour(speed)])
      : [...new Set(filtered.map(pitch => pitch.type))].sort().map(type => [type, palette.get(type)]);
    const legend = $('tracking-legend');
    legend.replaceChildren();
    for (const [label, colour] of entries) {
      const item = document.createElement('span');
      const swatch = document.createElement('i');
      swatch.style.setProperty('--swatch', colour);
      swatch.setAttribute('aria-hidden', 'true');
      item.append(swatch, document.createTextNode(label));
      legend.append(item);
    }
  }

  function plotFrame(label, count, instructions, outside = 0) {
    const total = `${count.toLocaleString()} ${count === 1 ? 'pitch' : 'pitches'}`;
    const svg = svgChart(viewSize, viewSize, `${label}. ${total}. ${instructions}`, 'group');
    svg.tabIndex = 0;
    const offMap = outside ? ` · ${outside.toLocaleString()} off map` : '';
    shape(svg, 'text', {x: margin, y: 16}, `${label} · ${total}${offMap}`);
    shape(svg, 'text', {x: margin, y: viewSize - 9}, 'Catcher’s left');
    shape(svg, 'text', {x: viewSize - margin, y: viewSize - 9, 'text-anchor': 'end'}, 'Catcher’s right');
    return svg;
  }

  function countAreas(pitches) {
    const cells = Array(gridSize * gridSize).fill(0);
    let outside = 0;
    for (const {x, y} of pitches) {
      if (Math.abs(x) > heatHalfWidth || y < heatLow || y > heatHigh) {
        outside++;
        continue;
      }
      const column = Math.min(gridSize - 1, Math.floor((x + heatHalfWidth) / (2 * heatHalfWidth) * gridSize));
      const row = Math.min(gridSize - 1, Math.floor((heatHigh - y) / (heatHigh - heatLow) * gridSize));
      cells[row * gridSize + column]++;
    }
    return {cells, outside};
  }

  function areaRect(index, cellsAcross = 1) {
    return {
      x: margin + (index % gridSize) * cellSize,
      y: margin + Math.floor(index / gridSize) * cellSize,
      width: cellSize * cellsAcross,
      height: cellSize * cellsAcross,
    };
  }

  function densityColour(intensity) {
    const low = [245, 243, 231], high = [22, 88, 134];
    return `rgb(${low.map((start, i) => Math.round(start + (high[i] - start) * intensity)).join(', ')})`;
  }

  function drawHeatLegend(peakShare) {
    const legend = $('tracking-legend');
    legend.replaceChildren();
    if (!peakShare) return;
    const scale = document.createElement('span');
    scale.className = 'heat-scale';
    const bar = document.createElement('b');
    bar.style.background = `linear-gradient(90deg, ${densityColour(0)}, ${densityColour(1)})`;
    bar.setAttribute('aria-hidden', 'true');
    scale.append(document.createTextNode('0%'), bar, document.createTextNode(`${(100 * peakShare).toFixed(1)}%`));
    legend.append(document.createTextNode('Share of a team’s selected pitches'), scale);
  }

  function drawHeatmaps(groups) {
    const samples = groups.map(group => ({...group, ...countAreas(group.pitches)}));
    const peakShare = Math.max(0, ...samples.flatMap(({cells, pitches}) => cells.map(count => count / (pitches.length || 1))));
    drawHeatLegend(peakShare);
    const highlights = [];
    let selected = Math.floor(gridSize * gridSize / 2);
    let mostPitches = 0;
    for (let i = 0; i < gridSize * gridSize; i++) {
      const combined = samples.reduce((total, sample) => total + sample.cells[i], 0);
      if (combined > mostPitches) {
        mostPitches = combined;
        selected = i;
      }
    }

    function selectArea(index) {
      selected = index;
      const {x, y} = areaRect(index);
      for (const outline of highlights) {
        outline.setAttribute('x', x);
        outline.setAttribute('y', y);
      }
      const area = `${rows[Math.floor(index / gridSize)]}, ${columnsFromCatcher[index % gridSize]}`;
      const rates = samples.map(({label, cells, pitches}) => {
        if (!pitches.length) return `${label} (no matching pitches)`;
        const count = cells[index];
        const total = `${pitches.length.toLocaleString()} ${pitches.length === 1 ? 'pitch' : 'pitches'}`;
        return `${label} ${(count / pitches.length * 100).toFixed(1)}% (${count.toLocaleString()} of ${total})`;
      });
      $('tracking-detail').textContent = `${area}. ${rates.join(' · ')}.`;
    }

    for (const {host, label, cells, pitches, outside} of samples) {
      const svg = plotFrame(label, pitches.length, 'Use arrow keys to compare areas of the plate.', outside);
      const marks = shape(svg, 'g', {'aria-hidden': 'true'});
      cells.forEach((count, index) => {
        const intensity = peakShare && pitches.length ? count / pitches.length / peakShare : 0;
        shape(marks, 'rect', {...areaRect(index), fill: densityColour(intensity),
          stroke: '#faf7ef', 'stroke-width': .55, 'data-heat-cell': index});
      });
      const zoneStart = 3 * gridSize + 3;
      shape(svg, 'rect', {...areaRect(zoneStart, 3), fill: 'none', stroke: '#263e50',
        'stroke-width': 2, 'pointer-events': 'none'});
      highlights.push(shape(svg, 'rect', {...areaRect(selected), fill: 'none', stroke: '#9d582e',
        'stroke-width': 2.5, 'pointer-events': 'none', 'data-heat-selection': ''}));
      svg.addEventListener('click', event => {
        if (event.target.hasAttribute('data-heat-cell')) selectArea(Number(event.target.getAttribute('data-heat-cell')));
      });
      svg.addEventListener('keydown', event => {
        const row = Math.floor(selected / gridSize), column = selected % gridSize;
        const adjacent = {ArrowUp: row > 0 ? -gridSize : 0, ArrowDown: row < gridSize - 1 ? gridSize : 0,
          ArrowLeft: column > 0 ? -1 : 0, ArrowRight: column < gridSize - 1 ? 1 : 0};
        if (!(event.key in adjacent)) return;
        event.preventDefault();
        selectArea(selected + adjacent[event.key]);
      });
      host.replaceChildren(svg);
    }
    selectArea(selected);
  }

  function plotPitches(host, pitches, label) {
    const w = viewSize, h = viewSize;
    const x = value => w / 2 + value * (w / 2 - margin) / domain.x;
    const y = value => h - margin - (value - domain.lowY) * (h - 2 * margin) / (domain.highY - domain.lowY);
    const svg = plotFrame(label, pitches.length, 'Use left and right arrow keys to inspect pitches.');
    shape(svg, 'line', {x1: x(0), x2: x(0), y1: margin, y2: h - margin, stroke: '#c2c5ba', 'stroke-dasharray': '3 4'});
    shape(svg, 'rect', {x: x(-zoneHalfWidth), width: x(zoneHalfWidth) - x(-zoneHalfWidth), y: y(1), height: y(0) - y(1),
      fill: '#ffffff', 'fill-opacity': '.35', stroke: '#546b78', 'stroke-width': 1.5});
    const marks = shape(svg, 'g', {'aria-hidden': 'true'});
    const dense = pitches.length > 120;
    pitches.forEach((pitch, index) => {
      shape(marks, 'circle', {cx: x(pitch.x), cy: y(pitch.y), r: dense ? 2.4 : 3.8, opacity: dense ? .42 : .78,
        fill: colourFilter.value === 'speed' ? speedColour(pitch.speed) : palette.get(pitch.type), 'data-track-index': index});
    });
    const selection = shape(svg, 'circle', {r: 6, fill: 'none', stroke: '#132e42', 'stroke-width': 2, 'pointer-events': 'none', visibility: 'hidden'});
    let selected = -1;
    function inspect(index) {
      if (!pitches.length || index === selected) return;
      selected = index;
      const pitch = pitches[index];
      selection.setAttribute('cx', x(pitch.x));
      selection.setAttribute('cy', y(pitch.y));
      selection.setAttribute('visibility', 'visible');
      const horizontal = pitch.x === 0 ? 'plate centre' : `${Math.abs(pitch.x * 12).toFixed(1)} in ${pitch.x < 0 ? 'left' : 'right'} of centre`;
      $('tracking-detail').textContent = `${pitch.player} (${pitch.team}) · ${pitch.type} · ${pitch.speed.toFixed(1)} mph · ${horizontal} · ${pitch.z.toFixed(2)} ft high · ${pitch.date}`;
    }
    for (const eventType of ['pointerover', 'click']) {
      svg.addEventListener(eventType, event => {
        if (event.target.hasAttribute('data-track-index')) inspect(Number(event.target.getAttribute('data-track-index')));
      });
    }
    svg.addEventListener('keydown', event => {
      if (!pitches.length || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const delta = event.key === 'ArrowLeft' ? -1 : 1;
      inspect(selected === -1 ? 0 : (selected + delta + pitches.length) % pitches.length);
    });
    if (!pitches.length) shape(svg, 'text', {x: w / 2, y: h / 2, 'text-anchor': 'middle'}, 'No pitches match this selection.');
    host.replaceChildren(svg);
  }

  function render() {
    if (!records.length) return;
    const active = records.filter(pitch => inSeries(pitch) && (!typeFilter.value || pitch.type === typeFilter.value));
    const opponent = series === 'all' ? 'Opponents' : document.querySelector(`[data-out-series="${series}"]`).textContent;
    const groups = Object.entries(pitchers).map(([side, picker]) => ({
      host: plots[side],
      label: side === 'TOR' ? 'Toronto' : opponent,
      pitches: active.filter(pitch => (pitch.team === 'TOR') === (side === 'TOR')
        && (!picker.value || pitch.playerId === picker.value)),
    }));
    const heatmap = mode === 'heatmap';
    $('tracking-colour-control').hidden = heatmap;
    $('tracking-guide').textContent = heatmap
      ? 'Darker squares show where a team threw more often. Both maps use the same colour scale. Select a square to compare that area.'
      : 'Each dot is a pitch. Select a dot or use the arrow keys for the pitcher, pitch type, speed and location.';
    if (heatmap) {
      drawHeatmaps(groups);
    } else {
      drawPitchLegend(groups.flatMap(({pitches}) => pitches));
      for (const {host, pitches, label} of groups) plotPitches(host, pitches, label);
      $('tracking-detail').textContent = 'Select an individual pitch for details.';
    }
  }

  function updateSeries() {
    if (!records.length) return;
    const selected = records.filter(inSeries);
    const covered = [...coverage].filter(game => series === 'all' || game.endsWith(`/${series}`)).length;
    status.textContent = `Tracked pitches for both teams in ${covered} of ${POSTSEASON_OUTS[series].games} selected games (${selected.length.toLocaleString()} pitches).`;
    const types = [...new Set(selected.map(pitch => pitch.type))].sort();
    setOptions(typeFilter, 'All types', types.map(type => [type, type]));
    for (const side of ['TOR', 'OPP']) {
      const options = new Map(selected.filter(pitch => (pitch.team === 'TOR') === (side === 'TOR'))
        .map(pitch => [pitch.playerId, `${pitch.player} (${pitch.team})`]));
      setOptions(pitchers[side], 'All pitchers', [...options].sort((a, b) => a[1].localeCompare(b[1])));
    }
    render();
  }

  function load(source) {
    const imported = importPitches(source);
    records = imported.pitches;
    coverage = imported.paired;
    domain = {
      x: Math.max(heatHalfWidth, ...records.map(pitch => Math.abs(pitch.x) + 0.05)),
      lowY: Math.min(heatLow, ...records.map(pitch => pitch.y - .02)),
      highY: Math.max(heatHigh, ...records.map(pitch => pitch.y + .02)),
      lowSpeed: Math.min(...records.map(pitch => pitch.speed)),
      highSpeed: Math.max(...records.map(pitch => pitch.speed)),
    };
    palette = new Map([...new Set(records.map(pitch => pitch.type))].sort().map((type, i) => [type, colours[i % colours.length]]));
    exhibit.hidden = false;
    updateSeries();
  }

  fileInput.addEventListener('change', async () => {
    const [file] = fileInput.files;
    if (!file) return;
    const request = ++latestImport;
    try {
      const source = await file.text();
      if (request === latestImport) load(source);
    } catch (error) {
      if (request !== latestImport) return;
      records = [];
      exhibit.hidden = true;
      status.textContent = error.message;
    }
  });
  for (const button of modeButtons) {
    button.addEventListener('click', () => {
      mode = button.dataset.trackingMode;
      for (const choice of modeButtons) choice.setAttribute('aria-pressed', String(choice === button));
      render();
    });
  }
  for (const control of [typeFilter, colourFilter, pitchers.TOR, pitchers.OPP]) control.addEventListener('change', render);
  $('outs-explorer').addEventListener('postseason-series', event => {
    series = event.detail;
    updateSeries();
  });
  const embedded = JSON.parse($('statcast-postseason-json').textContent);
  if (embedded) {
    try {
      load(embedded);
    } catch (error) {
      status.textContent = error.message;
    }
  }
})();
