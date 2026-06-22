(function () {
  const OUTER_RADIUS = 260;
  const INNER_RADIUS = 80;
  const HUMIDITY_RING_WIDTH = 50;
  const HUMIDITY_GAP = 10;
  const MONTH_LABELS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const svg = d3.select('#wheel');
  const tooltip = d3.select('#tooltip');

  let g;

  function setup() {
    const contentRadius = OUTER_RADIUS + HUMIDITY_RING_WIDTH + HUMIDITY_GAP + 40;
    const size = contentRadius * 2;

    svg
      .attr('viewBox', `${-contentRadius} ${-contentRadius} ${size} ${size}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    g = svg.append('g');
  }

  // Temperature scale: maps temp to radius
  // Indoor sensor: typical range 15-35°C, with rare outliers below
  const rTemp = d3.scaleLinear()
    .domain([10, 35])
    .range([INNER_RADIUS, OUTER_RADIUS]);

  // Multi-stop color scale for indoor sensor range
  const tempColorScale = d3.scaleLinear()
    .domain([15, 20, 25, 30, 35])
    .range(['#4fc3f7', '#81c784', '#ffb74d', '#ff7043', '#e53935'])
    .interpolate(d3.interpolateHcl);

  const arc = d3.arc();

  function drawRefs(days) {
    // Remove previous refs
    g.selectAll('.ref, .ref-label').remove();

    // Compute range from actual data
    const allMin = d3.min(days, d => d.minTemp);
    const allMax = d3.max(days, d => d.maxTemp);

    // Round to nearest 5°C for nice ticks
    const tickMin = Math.floor(allMin / 5) * 5;
    const tickMax = Math.ceil(allMax / 5) * 5;

    // Update the temperature scale domain
    rTemp.domain([tickMin, tickMax]);

    const refsData = d3.range(tickMin, tickMax + 1, 5);

    // Reference circles
    g.selectAll('.ref-circle')
      .data(refsData)
      .enter().append('circle')
      .attr('class', d => d === 20 ? 'ref ref-zero' : 'ref')
      .attr('r', d => rTemp(d));

    // Labels just to the right of the Jan 1 tick, below the circle line
    g.selectAll('.ref-label')
      .data(refsData)
      .enter().append('text')
      .attr('class', 'ref-label')
      .attr('x', 5)
      .attr('y', d => -rTemp(d))
      .attr('dy', '1.5em')
      .style('text-anchor', 'start')
      .text(d => `${d}°C`);

    // Outer humidity reference circle
    g.append('circle')
      .attr('class', 'ref')
      .attr('r', OUTER_RADIUS)
      .style('stroke', 'rgba(79, 195, 247, 0.2)');
  }

  function drawMonthLabels(days) {
    const angleScale = d3.scaleLinear()
      .domain([1, 366])
      .range([0, 2 * Math.PI]);

    // Month start days (approximate)
    const monthStarts = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

    // Radial ticks at month boundaries
    const tickInner = INNER_RADIUS - 5;
    const tickOuter = OUTER_RADIUS + HUMIDITY_RING_WIDTH + HUMIDITY_GAP + 5;

    g.selectAll('.month-tick')
      .data(monthStarts)
      .enter().append('line')
      .attr('class', 'month-tick')
      .attr('x1', d => tickInner * Math.cos(angleScale(d) - Math.PI / 2))
      .attr('y1', d => tickInner * Math.sin(angleScale(d) - Math.PI / 2))
      .attr('x2', d => tickOuter * Math.cos(angleScale(d) - Math.PI / 2))
      .attr('y2', d => tickOuter * Math.sin(angleScale(d) - Math.PI / 2));

    // Month labels positioned at the middle of each month
    g.selectAll('.month-label')
      .data(MONTH_LABELS)
      .enter().append('text')
      .attr('class', 'month-label')
      .attr('transform', (d, i) => {
        const a = angleScale(monthStarts[i] + 15) - Math.PI / 2;
        const r = OUTER_RADIUS + HUMIDITY_RING_WIDTH + HUMIDITY_GAP + 18;
        const deg = a * 180 / Math.PI;
        // Flip labels in the bottom half (Apr-Sep) so they read right-side up
        const isBottom = deg > 0 && deg < 180;
        const rotation = isBottom ? deg - 90 : deg + 90;
        return `translate(${r * Math.cos(a)}, ${r * Math.sin(a)}) rotate(${rotation})`;
      })
      .text(d => d);
  }

  function getDayOfYear(dateStr) {
    const date = new Date(dateStr);
    const start = new Date(date.getFullYear(), 0, 1);
    return Math.floor((date - start) / (1000 * 60 * 60 * 24));
  }

  // For "all" mode: get position of a date within the full chronological range

  function drawYearLabels(days) {
    // Determine the chronological span
    const firstDate = new Date(days[0].date);
    const lastDate = new Date(days[days.length - 1].date);
    const totalSpanDays = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;

    const angleScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, 2 * Math.PI]);

    // Find year boundaries within the data range
    const firstYear = firstDate.getFullYear();
    const lastYear = lastDate.getFullYear();
    const yearStarts = [];

    for (let y = firstYear; y <= lastYear + 1; y++) {
      const yearDate = new Date(y, 0, 1);
      if (yearDate >= firstDate && yearDate <= lastDate) {
        const pos = (yearDate - firstDate) / (1000 * 60 * 60 * 24) / totalSpanDays;
        yearStarts.push({ year: y, pos });
      }
    }

    // Radial ticks at year boundaries
    const tickInner = INNER_RADIUS - 5;
    const tickOuter = OUTER_RADIUS + HUMIDITY_RING_WIDTH + HUMIDITY_GAP + 5;

    g.selectAll('.month-tick')
      .data(yearStarts)
      .enter().append('line')
      .attr('class', 'month-tick')
      .attr('x1', d => tickInner * Math.cos(angleScale(d.pos) - Math.PI / 2))
      .attr('y1', d => tickInner * Math.sin(angleScale(d.pos) - Math.PI / 2))
      .attr('x2', d => tickOuter * Math.cos(angleScale(d.pos) - Math.PI / 2))
      .attr('y2', d => tickOuter * Math.sin(angleScale(d.pos) - Math.PI / 2));

    // Year labels between ticks
    const yearLabels = [];
    for (let y = firstYear; y <= lastYear; y++) {
      const start = Math.max(0, ((new Date(y, 0, 1)) - firstDate) / (1000 * 60 * 60 * 24) / totalSpanDays);
      const end = Math.min(1, ((new Date(y + 1, 0, 1)) - firstDate) / (1000 * 60 * 60 * 24) / totalSpanDays);
      yearLabels.push({ year: y, pos: (start + end) / 2 });
    }

    g.selectAll('.month-label')
      .data(yearLabels)
      .enter().append('text')
      .attr('class', 'month-label')
      .attr('transform', d => {
        const a = angleScale(d.pos) - Math.PI / 2;
        const r = OUTER_RADIUS + HUMIDITY_RING_WIDTH + HUMIDITY_GAP + 18;
        const deg = a * 180 / Math.PI;
        const isBottom = deg > 0 && deg < 180;
        const rotation = isBottom ? deg - 90 : deg + 90;
        return `translate(${r * Math.cos(a)}, ${r * Math.sin(a)}) rotate(${rotation})`;
      })
      .text(d => d.year);
  }

  function drawWheel(days, label) {
    // Clear previous
    g.selectAll('.bar, .missing-bar, .humidity-line, .humidity-line-hover, .month-label, .month-tick, .hand, .title, .subtitle, .marker').remove();

    // Redraw temperature references based on current data
    drawRefs(days);

    // Always position bars by day-of-year (365 slots) for single year,
    // or chronologically for "all"
    const totalDays = 365;
    let anglePerDay, getAngle;

    if (label === 'all' && days.length > 0) {
      const firstDate = new Date(days[0].date);
      const lastDate = new Date(days[days.length - 1].date);
      const totalSpanDays = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;
      anglePerDay = (2 * Math.PI) / totalSpanDays;
      getAngle = (d) => {
        const date = new Date(d.date);
        const dayOffset = Math.floor((date - firstDate) / (1000 * 60 * 60 * 24));
        return (dayOffset / totalSpanDays) * 2 * Math.PI;
      };
    } else {
      anglePerDay = (2 * Math.PI) / totalDays;
      getAngle = (d) => (getDayOfYear(d.date) / totalDays) * 2 * Math.PI;
    }

    // Draw black slices for missing days
    if (label !== 'all') {
      const presentDays = new Set(days.map(d => getDayOfYear(d.date)));
      const missingDays = d3.range(0, totalDays).filter(d => !presentDays.has(d));
      g.selectAll('.missing-bar')
        .data(missingDays)
        .enter().append('path')
        .attr('class', 'missing-bar')
        .attr('d', dayNum => {
          const startAngle = (dayNum / totalDays) * 2 * Math.PI;
          const endAngle = startAngle + anglePerDay;
          return arc({
            innerRadius: INNER_RADIUS,
            outerRadius: OUTER_RADIUS,
            startAngle: startAngle,
            endAngle: endAngle
          });
        });
    }

    // Draw temperature bars
    const bars = g.selectAll('.bar')
      .data(days)
      .enter().append('path')
      .attr('class', 'bar')
      .attr('d', (d, i) => {
        const startAngle = getAngle(d);
        const endAngle = startAngle + anglePerDay;
        const domain = rTemp.domain();
        const innerR = Math.max(INNER_RADIUS, rTemp(Math.max(domain[0], d.minTemp)));
        const outerR = Math.max(innerR + 1, rTemp(Math.min(domain[1], d.maxTemp)));
        return arc({
          innerRadius: innerR,
          outerRadius: outerR,
          startAngle: startAngle,
          endAngle: endAngle
        });
      })
      .attr('fill', d => tempColorScale(d.meanTemp));

    // Tooltip interactions
    bars.on('mouseover', function (event, d) {
      const date = new Date(d.date);
      const formatted = date.toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
      });
      tooltip.style('opacity', 1)
        .html(`
          <div class="date">${formatted}</div>
          <div class="value">Min: <span>${d.minTemp.toFixed(1)}°C</span></div>
          <div class="value">Max: <span>${d.maxTemp.toFixed(1)}°C</span></div>
          <div class="value">Mean: <span>${d.meanTemp.toFixed(1)}°C</span></div>
          ${d.meanHumidity != null ? `<div class="value">Humidity: <span>${d.meanHumidity.toFixed(0)}%</span></div>` : ''}
          <div class="value">Readings: <span>${d.readings}</span></div>
        `);
    })
      .on('mousemove', function (event) {
        tooltip
          .style('left', (event.clientX + 12) + 'px')
          .style('top', (event.clientY - 10) + 'px');
      })
      .on('mouseout', function () {
        tooltip.style('opacity', 0);
      });

    // Humidity as three separate radial line charts, each in its own band
    const validHumidity = days.filter(d => d.meanHumidity != null && d.meanHumidity <= 100);

    const bandHeight = (HUMIDITY_RING_WIDTH - HUMIDITY_GAP * 2) / 3;
    const bandStart = OUTER_RADIUS + HUMIDITY_GAP;

    const humidityBands = [
      { key: 'minHumidity', cls: 'humidity-line-min', label: 'Min', offset: 0 },
      { key: 'meanHumidity', cls: 'humidity-line-mean', label: 'Mean', offset: bandHeight + HUMIDITY_GAP },
      { key: 'maxHumidity', cls: 'humidity-line-max', label: 'Max', offset: (bandHeight + HUMIDITY_GAP) * 2 },
    ];

    // Split into contiguous segments (break if gap > 1 day)
    const segments = [];
    let currentSegment = [];
    for (let i = 0; i < validHumidity.length; i++) {
      if (currentSegment.length === 0) {
        currentSegment.push(validHumidity[i]);
      } else {
        const prevDay = getDayOfYear(currentSegment[currentSegment.length - 1].date);
        const currDay = getDayOfYear(validHumidity[i].date);
        if (currDay - prevDay <= 2) {
          currentSegment.push(validHumidity[i]);
        } else {
          segments.push(currentSegment);
          currentSegment = [validHumidity[i]];
        }
      }
    }
    if (currentSegment.length) segments.push(currentSegment);

    // Draw reference circles for each band
    humidityBands.forEach(({ offset }) => {
      g.append('circle')
        .attr('class', 'ref')
        .attr('r', bandStart + offset + bandHeight / 2)
        .style('stroke', 'rgba(79, 195, 247, 0.08)');
    });

    // Draw lines per band
    humidityBands.forEach(({ key, cls, offset }) => {
      const bandRadius = d3.scaleLinear()
        .domain([0, 100])
        .range([bandStart + offset, bandStart + offset + bandHeight]);

      const radial = d3.lineRadial()
        .angle(d => getAngle(d))
        .radius(d => bandRadius(d[key]))
        .curve(d3.curveCardinal);

      segments.forEach(segment => {
        if (segment.length < 2) return;
        g.append('path')
          .datum(segment)
          .attr('class', `humidity-line ${cls}`)
          .attr('d', radial);
      });
    });

    // Invisible hover target across all bands (follows mean line position)
    const hoverRadius = d3.scaleLinear()
      .domain([0, 100])
      .range([bandStart, bandStart + HUMIDITY_RING_WIDTH]);

    const hoverLine = d3.lineRadial()
      .angle(d => getAngle(d))
      .radius(d => hoverRadius(d.meanHumidity))
      .curve(d3.curveCardinal);

    segments.forEach(segment => {
      if (segment.length < 2) return;
      g.append('path')
        .datum(segment)
        .attr('class', 'humidity-line-hover')
        .attr('d', hoverLine)
        .on('mousemove', function (event) {
          const [mx, my] = d3.pointer(event, g.node());
          let angle = Math.atan2(my, mx) + Math.PI / 2;
          if (angle < 0) angle += 2 * Math.PI;

          const closest = validHumidity.reduce((best, d) => {
            let dAngle = getAngle(d);
            const dist = Math.abs(dAngle - angle);
            return dist < best.dist ? { d, dist } : best;
          }, { d: null, dist: Infinity });

          if (closest.d) {
            const d = closest.d;
            const date = new Date(d.date);
            const formatted = date.toLocaleDateString('en-US', {
              weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
            });
            tooltip.style('opacity', 1)
              .html(`
                <div class="date">${formatted}</div>
                <div class="value">Humidity: <span>${d.meanHumidity.toFixed(1)}%</span></div>
                <div class="value">Min: <span>${d.minHumidity.toFixed(1)}%</span></div>
                <div class="value">Max: <span>${d.maxHumidity.toFixed(1)}%</span></div>
              `);
          }
          tooltip
            .style('left', (event.clientX + 12) + 'px')
            .style('top', (event.clientY - 10) + 'px');
        })
        .on('mouseout', function () {
          tooltip.style('opacity', 0);
        });
    });

    // Month labels and ticks (skip for "all" — use year labels instead)
    if (label !== 'all') {
      drawMonthLabels(days);
    } else {
      drawYearLabels(days);
    }

    // Mark hottest and coldest days with full radial ticks (like month ticks, drawn below bars)
    const hottestDay = days.reduce((best, d) => d.maxTemp > best.maxTemp ? d : best, days[0]);
    const coldestDay = days.reduce((best, d) => d.minTemp < best.minTemp ? d : best, days[0]);
    const widestDay = days.reduce((best, d) => (d.maxTemp - d.minTemp) > (best.maxTemp - best.minTemp) ? d : best, days[0]);
    const nicestDay = days.reduce((best, d) => {
      const score = Math.abs(d.meanTemp - 23) + (d.maxTemp - d.minTemp) * 0.3;
      const bestScore = Math.abs(best.meanTemp - 23) + (best.maxTemp - best.minTemp) * 0.3;
      return score < bestScore ? d : best;
    }, days[0]);

    const tickInner = INNER_RADIUS - 5;
    const tickOuter = OUTER_RADIUS + HUMIDITY_RING_WIDTH + HUMIDITY_GAP + 5;

    [
      { day: hottestDay, cls: 'marker-hot', tooltipLabel: 'Hottest day', temp: hottestDay.maxTemp, tempLabel: 'Max', behind: false },
      { day: coldestDay, cls: 'marker-cold', tooltipLabel: 'Coldest day', temp: coldestDay.minTemp, tempLabel: 'Min', behind: false },
      { day: widestDay, cls: 'marker-wide', tooltipLabel: 'Widest range', temp: widestDay.maxTemp - widestDay.minTemp, tempLabel: 'Range', behind: true },
      { day: nicestDay, cls: 'marker-nice', tooltipLabel: 'Nicest day', temp: nicestDay.meanTemp, tempLabel: 'Mean', behind: true },
    ].forEach(({ day, cls, tooltipLabel, temp, tempLabel, behind }) => {
      const angle = getAngle(day) + anglePerDay / 2 - Math.PI / 2;

      // Full radial tick — insert behind bars for "wide", append on top for others
      const line = behind
        ? g.insert('line', '.bar')
        : g.append('line');

      line
        .attr('class', `marker ${cls}`)
        .attr('x1', tickInner * Math.cos(angle))
        .attr('y1', tickInner * Math.sin(angle))
        .attr('x2', tickOuter * Math.cos(angle))
        .attr('y2', tickOuter * Math.sin(angle))
        .on('mouseover', function (event) {
          const date = new Date(day.date);
          const formatted = date.toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
          });
          tooltip.style('opacity', 1)
            .html(`
              <div class="date">${tooltipLabel}</div>
              <div class="value">${formatted}</div>
              <div class="value">${tempLabel}: <span>${temp.toFixed(1)}°C</span></div>
            `);
        })
        .on('mousemove', function (event) {
          tooltip
            .style('left', (event.clientX + 12) + 'px')
            .style('top', (event.clientY - 10) + 'px');
        })
        .on('mouseout', function () {
          tooltip.style('opacity', 0);
        });
    });

    // Draw the "hand" line pointing to Jan 1st
    g.append('line')
      .attr('class', 'hand')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', -INNER_RADIUS + 10)
      .attr('y2', -OUTER_RADIUS - HUMIDITY_RING_WIDTH - HUMIDITY_GAP - 10);

    // Title
    const titleText = label === 'all' ? 'DHT22' : label;
    g.append('text')
      .attr('class', 'title')
      .attr('dy', '-0.2em')
      .text(titleText);

    g.append('text')
      .attr('class', 'subtitle')
      .attr('dy', '1.2em')
      .text(label === 'all' ? '2024 – 2026' : `${days.length} days`);
  }

  // Load data and render
  d3.json('data-by-year.json').then(function (dataByYear) {
    setup();

    // Flatten all years for "all" view
    const allDays = Object.values(dataByYear).flat();

    // Initial render: show current year
    const currentYear = new Date().getFullYear().toString();
    const initialYear = dataByYear[currentYear] ? currentYear : '2025';
    drawWheel(dataByYear[initialYear] || allDays, initialYear);
    document.querySelector(`[data-year="${initialYear}"]`).classList.add('active');
    document.querySelector('[data-year="all"]').classList.remove('active');

    // Year button handlers
    document.querySelectorAll('.year-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const year = this.dataset.year;
        if (year === 'all') {
          drawWheel(allDays, 'all');
        } else {
          drawWheel(dataByYear[year] || [], year);
        }
      });
    });
  });
})();
