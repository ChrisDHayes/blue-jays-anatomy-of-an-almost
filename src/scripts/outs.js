const POSTSEASON_OUTS = JSON.parse($('postseason-outs-json').textContent);

(() => {
  const exhibit = $('outs-explorer');
  const seriesButtons = [...exhibit.querySelectorAll('[data-out-series]')];
  const pitchKind = $('out-pitch-kind');
  const contactKind = $('out-field-contact');
  const pitchTable = $('out-pitch-counts');
  const field = $('out-field-positions');
  const positions = [
    ['Pitcher', 'P', 50, 65], ['Catcher', 'C', 50, 88],
    ['First base', '1B', 85, 65], ['Second base', '2B', 70, 43],
    ['Third base', '3B', 15, 65], ['Shortstop', 'SS', 30, 43],
    ['Left field', 'LF', 18, 19], ['Centre field', 'CF', 50, 14],
    ['Right field', 'RF', 82, 19],
  ];
  let series = 'all';
  let selectedCount = '0-2';
  let selectedPosition = 6;

  const percentage = (count, total) => total ? `${(100 * count / total).toFixed(1)}%` : '—';

  function comparePitch(count) {
    const info = POSTSEASON_OUTS[series];
    const detail = (side) => {
      const stats = side.pitches[count];
      const result = stats[pitchKind.value];
      return `${percentage(result, stats.total)} (${result} of ${stats.total} pitches)`;
    };
    const [balls, strikes] = count.split('-');
    const ballLabel = balls === '1' ? 'ball' : 'balls';
    const strikeLabel = strikes === '1' ? 'strike' : 'strikes';
    const outcome = pitchKind.selectedOptions[0].textContent;
    return `${balls} ${ballLabel}, ${strikes} ${strikeLabel} · ${outcome}. Toronto ${detail(info.toronto)} · Opponents ${detail(info.opponents)}.`;
  }

  function markPitchSelection() {
    for (const button of pitchTable.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.count === selectedCount));
    }
    $('out-pitch-detail').textContent = comparePitch(selectedCount);
  }

  function drawCounts() {
    const {toronto, opponents} = POSTSEASON_OUTS[series];
    const strikeouts = `Strikeouts per batter faced. Toronto ${percentage(toronto.strikeouts, toronto.pa)} (${toronto.strikeouts}/${toronto.pa}) · Opponents ${percentage(opponents.strikeouts, opponents.pa)} (${opponents.strikeouts}/${opponents.pa}).`;
    const walks = ` Walks. Toronto ${percentage(toronto.walks, toronto.pa)} · Opponents ${percentage(opponents.walks, opponents.pa)}.`;
    $('out-pitch-summary').textContent = strikeouts + walks;
    pitchTable.replaceChildren();
    for (let balls = 0; balls < 4; balls++) {
      const row = document.createElement('tr');
      const heading = document.createElement('th');
      heading.scope = 'row';
      heading.textContent = balls;
      row.append(heading);
      for (let strikes = 0; strikes < 3; strikes++) {
        const count = `${balls}-${strikes}`;
        const a = toronto.pitches[count], b = opponents.pitches[count];
        const cell = document.createElement('td');
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.count = count;
        for (const [abbr, sample] of [['TOR', a], [series === 'all' ? 'OPP' : series, b]]) {
          const rate = document.createElement('span');
          rate.textContent = `${abbr} ${percentage(sample[pitchKind.value], sample.total)}`;
          button.append(rate);
        }
        if (a.total && b.total) {
          const difference = 100 * (a[pitchKind.value] / a.total - b[pitchKind.value] / b.total);
          if (difference !== 0) {
            button.dataset.side = difference > 0 ? 'toronto' : 'opponents';
            button.style.setProperty('--out-strength', Math.min(Math.abs(difference) / 45, 0.58));
          }
        }
        button.setAttribute('aria-label', comparePitch(count));
        button.addEventListener('click', () => {
          selectedCount = count;
          markPitchSelection();
        });
        cell.append(button);
        row.append(cell);
      }
      pitchTable.append(row);
    }
    markPitchSelection();
  }

  function fieldDescription(position) {
    const {toronto, opponents} = POSTSEASON_OUTS[series];
    const detail = (side) => {
      const stats = side.fielding[contactKind.value][position];
      return `${percentage(stats.out, stats.balls)} (${stats.out} of ${stats.balls} plays)`;
    };
    return `${positions[position - 1][0]}. Toronto ${detail(toronto)} · Opponents ${detail(opponents)}.`;
  }

  function markFieldSelection() {
    for (const button of field.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.position) === selectedPosition));
    }
    $('out-field-detail').textContent = fieldDescription(selectedPosition);
  }

  function drawField() {
    const {toronto, opponents} = POSTSEASON_OUTS[series];
    const sets = [toronto.fielding[contactKind.value], opponents.fielding[contactKind.value]];
    const overall = sets.map(set => {
      const totals = Object.values(set).reduce(([out, balls], value) => [out + value.out, balls + value.balls], [0, 0]);
      return `${percentage(...totals)} (${totals[0]}/${totals[1]})`;
    });
    $('out-field-summary').textContent = `Fielded balls with an out. Toronto ${overall[0]} · Opponents ${overall[1]}.`;
    field.replaceChildren();
    positions.forEach(([, short, x, y], index) => {
      const position = index + 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.position = position;
      button.style.left = `${x}%`;
      button.style.top = `${y}%`;
      button.setAttribute('aria-label', fieldDescription(position));
      const label = document.createElement('span');
      label.textContent = short;
      button.append(label);
      for (const [setIndex, set] of sets.entries()) {
        const row = document.createElement('span');
        const bar = document.createElement('i');
        const stats = set[position];
        row.className = setIndex === 0 ? 'out-position-tor' : 'out-position-opp';
        row.setAttribute('aria-hidden', 'true');
        bar.style.width = stats.balls ? percentage(stats.out, stats.balls) : '0%';
        row.append(bar);
        button.append(row);
      }
      button.addEventListener('click', () => {
        selectedPosition = position;
        markFieldSelection();
      });
      field.append(button);
    });
    markFieldSelection();
  }

  for (const button of seriesButtons) {
    button.addEventListener('click', () => {
      series = button.dataset.outSeries;
      for (const choice of seriesButtons) {
        choice.setAttribute('aria-pressed', String(choice === button));
      }
      drawCounts();
      drawField();
      exhibit.dispatchEvent(new CustomEvent('postseason-series', {detail: series}));
    });
  }
  pitchKind.addEventListener('change', drawCounts);
  contactKind.addEventListener('change', drawField);
  drawCounts();
  drawField();
})();
