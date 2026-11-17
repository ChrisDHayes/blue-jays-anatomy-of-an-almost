(() => {
  'use strict';
  const evidence = JSON.parse(document.getElementById('bunt-comparison-json').textContent);
  const sampleSelect = document.getElementById('bunt-sample');
  const buttons = [...document.querySelectorAll('[data-objective]')];
  const rows = [...document.querySelectorAll('[data-bunt-cohort]')];
  const put = (id, value) => { document.getElementById(id).textContent = value; };
  const number = value => value.toLocaleString('en-CA');
  const percent = value => `${(value * 100).toFixed(1)}%`;
  const names = {bunt: 'Bunt attempted', no_bunt: 'No bunt recorded'};
  let objective = 'one';

  function renderComparison() {
    const sample = evidence.samples[sampleSelect.value];
    const one = objective === 'one';
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.objective === objective));
    put('bunt-sample-note', `${number(sample.n)} comparable starts · 2025 MLB · innings 1–8. ${sampleSelect.value === 'all' ? 'Any score margin; runners and outs match.' : 'The batting team trailed by one; runners and outs also match.'}`);
    put('objective-heading', one ? 'How often did at least one run score?' : 'How often did two or more runs score?');
    put('objective-text', one
      ? 'In Toronto’s situation, exactly one run would send the game to the 12th; two would win it in the 11th.'
      : 'Two runs would win it in the 11th. This measure does not include a later victory after tying the game.');
    for (const row of rows) {
      const cohort = sample.cohorts[row.dataset.buntCohort];
      const metric = cohort.metrics[objective];
      const [low, high] = metric.interval95;
      row.querySelector('strong').textContent = percent(metric.rate);
      row.querySelector('.bunt-bar-fill').style.width = percent(metric.rate);
      row.querySelector('.bunt-bar-dot').style.left = percent(metric.rate);
      row.querySelector('.bunt-bar-interval').style.left = percent(low);
      row.querySelector('.bunt-bar-interval').style.width = percent(high - low);
      row.querySelector('.bunt-rate-detail').textContent = `${number(metric.count)} of ${number(cohort.n)} cases · 95% interval ${percent(low)}–${percent(high)}`;
    }
    const bunt = sample.cohorts.bunt;
    const noBunt = sample.cohorts.no_bunt;
    const gap = 100 * (noBunt.metrics[objective].rate - bunt.metrics[objective].rate);
    const difference = Math.abs(gap).toFixed(1);
    const lead = Math.abs(gap) < 1
      ? `The observed rates are close: ${difference} percentage points apart.`
      : `${gap > 0 ? 'No recorded bunt' : 'Bunt attempts'} had the higher observed rate, by ${difference} percentage points.`;
    put('bunt-takeaway', `${lead} The uncertainty ranges overlap, and the groups contain different players and situations.`);
    put('objective-evidence', `Bars show observed rates; lines show approximate 95% sampling intervals. The bunt sample contains ${number(bunt.n)} attempts, including ${number(bunt.sacrifices_credited)} credited sacrifices. ${bunt.n < 50 ? 'This narrower sample is small; treat the apparent difference cautiously.' : 'This comparison includes unsuccessful attempts and changes of approach.'}`);
    const body = document.getElementById('bunt-outcomes');
    body.replaceChildren();
    for (const key of ['bunt', 'no_bunt']) {
      const cohort = sample.cohorts[key];
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = names[key];
      tr.append(th);
      for (const bin of ['0', '1', '2']) {
        const td = document.createElement('td');
        const count = document.createElement('strong');
        count.textContent = number(cohort.runs[bin]);
        const share = document.createElement('span');
        share.textContent = percent(cohort.runs[bin] / cohort.n);
        td.append(count, share);
        tr.append(td);
      }
      body.append(tr);
    }
    put('bunt-mean-runs', `Average runs remaining: ${bunt.mean_runs.toFixed(2)} after a bunt attempt; ${noBunt.mean_runs.toFixed(2)} with no recorded bunt. These averages use the selected historical sample; the observed-play RE24 uses the separate league state table.`);
  }
  for (const button of buttons) button.addEventListener('click', () => {
    objective = button.dataset.objective;
    renderComparison();
  });
  sampleSelect.addEventListener('change', renderComparison);
  renderComparison();
})();
