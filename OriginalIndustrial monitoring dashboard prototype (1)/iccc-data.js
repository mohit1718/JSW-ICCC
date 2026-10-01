/* JSW ICCC — simulated plant dataset (3 months) + chart builders.
   Frequencies follow the BF data model: BF1/BF2 = event+daily+hourly,
   BF3/BF4 = event+daily+hourly, BF5 = event+daily+5-minute. */
(function () {
  var IST = 5.5 * 3600e3;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var HOUR = 3600e3, DAY = 86400e3;
  var NOW = Math.floor(Date.now() / 60000) * 60000; // current time — dataset always ends now
  var SPAN = 90 * DAY;

  function d2(x) { return x < 10 ? '0' + x : '' + x; }
  function mul(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function fmt(v, dp) {
    if (v == null || !isFinite(v)) return '—';
    var s = Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-IN') : v.toFixed(dp == null ? 1 : dp);
    return s;
  }
  function clockLabel(ms) { var d = new Date(ms + IST); return d2(d.getUTCHours()) + ':' + d2(d.getUTCMinutes()); }
  function dateLabel(ms) { var d = new Date(ms + IST); return d2(d.getUTCDate()) + ' ' + MON[d.getUTCMonth()]; }
  function stampLabel(ms) { return dateLabel(ms) + ' ' + clockLabel(ms); }
  function labelFor(ms, step) { return step < DAY ? clockLabel(ms) : dateLabel(ms); }

  /* seeded mean-reverting walk with diurnal shape + anomaly windows */
  function walk(key, n, base, cfg) {
    cfg = cfg || {};
    var r = mul(hash(key)), out = new Float64Array(n), v = 0;
    var sig = cfg.sigma == null ? 0.010 : cfg.sigma;
    var rev = cfg.revert == null ? 0.05 : cfg.revert;
    var amp = cfg.diurnal || 0, per = cfg.period || 24, drift = cfg.drift || 0;
    var an = cfg.anoms || [];
    for (var i = 0; i < n; i++) {
      v += (r() - 0.5) * 2 * sig - v * rev;
      var s = amp * Math.sin((i / per) * Math.PI * 2 + (cfg.phase || 0));
      var a = 0;
      for (var k = 0; k < an.length; k++) {
        var f = an[k], from = f.at * n, to = (f.at + f.w) * n;
        if (i >= from && i <= to) a += f.mag * Math.sin(((i - from) / Math.max(1, to - from)) * Math.PI);
      }
      out[i] = base * (1 + v + s + a + drift * (i / n));
    }
    return out;
  }

  var PARAM = {
    production: { label: 'Production', unit: 'TPD', dp: 0, short: 'Prod' },
    hmRate: { label: 'HM Rate', unit: 't/hr', dp: 1, short: 'HM' },
    cokeRate: { label: 'Coke Rate', unit: 'kg/tHM', dp: 1, short: 'Coke' },
    coalRate: { label: 'Coal Rate', unit: 'kg/tHM', dp: 1, short: 'Coal' },
    fuelRate: { label: 'Fuel Rate', unit: 'kg/tHM', dp: 1, short: 'Fuel' },
    rtv: { label: 'RTV / TRT', unit: 'MW', dp: 1, short: 'TRT' },
    topPressure: { label: 'Top Pressure', unit: 'bar', dp: 2, short: 'Top P' },
    topGasTemp: { label: 'Top Gas Temp', unit: '°C', dp: 0, short: 'TGT' },
    o2: { label: 'Oxygen Enrichment', unit: '%', dp: 2, short: 'O₂' },
    slagRate: { label: 'Slag Rate', unit: 'kg/tHM', dp: 0, short: 'Slag' },
    bfGas: { label: 'BF Gas Generation', unit: 'kNm³/hr', dp: 0, short: 'BF Gas' }
  };

  var C = {
    ok: '#11734e', warn: '#895b06', crit: '#bc3128', off: '#5c584f',
    a1: '#5b4fbf', a2: '#6055c4', line: '#c2bbab', mute: '#5c584f', tgt: '#2e2c27'
  };

  var FUR = [
    { id: 'BF1', cap: 3200, health: 'healthy', freqs: ['event', 'daily', 'hourly'], res: 'Hourly', alarms: 3,
      base: { production: 3186, hmRate: 132.8, cokeRate: 352, coalRate: 168, fuelRate: 520, rtv: 14.2, topPressure: 2.35, topGasTemp: 178, o2: 4.60, slagRate: 288, bfGas: 206 },
      target: { production: 3200, hmRate: 133.3, cokeRate: 345, coalRate: 170, fuelRate: 515, rtv: 15.0, topPressure: 2.40, topGasTemp: 175, o2: 4.80, slagRate: 285, bfGas: 210 } },
    { id: 'BF2', cap: 2800, health: 'warning', freqs: ['event', 'daily', 'hourly'], res: 'Hourly', alarms: 7,
      base: { production: 2712, hmRate: 113.0, cokeRate: 364, coalRate: 157, fuelRate: 521, rtv: 12.6, topPressure: 2.26, topGasTemp: 189, o2: 4.28, slagRate: 297, bfGas: 187 },
      target: { production: 2800, hmRate: 116.7, cokeRate: 350, coalRate: 168, fuelRate: 518, rtv: 13.5, topPressure: 2.30, topGasTemp: 180, o2: 4.50, slagRate: 290, bfGas: 195 } },
    { id: 'BF3', cap: 1950, health: 'healthy', freqs: ['event', 'daily', 'hourly'], res: 'Hourly', alarms: 2,
      base: { production: 1884, hmRate: 78.5, cokeRate: 369, coalRate: 150, fuelRate: 519, rtv: 9.4, topPressure: 1.95, topGasTemp: 192, o2: 3.90, slagRate: 305, bfGas: 132 },
      target: { production: 1950, hmRate: 81.3, cokeRate: 358, coalRate: 158, fuelRate: 516, rtv: 10.0, topPressure: 2.00, topGasTemp: 188, o2: 4.00, slagRate: 300, bfGas: 138 } },
    { id: 'BF4', cap: 2100, health: 'critical', freqs: ['event', 'daily', 'hourly'], res: 'Hourly', alarms: 11,
      base: { production: 1962, hmRate: 81.8, cokeRate: 379, coalRate: 143, fuelRate: 522, rtv: 9.6, topPressure: 2.02, topGasTemp: 204, o2: 3.62, slagRate: 316, bfGas: 138 },
      target: { production: 2100, hmRate: 87.5, cokeRate: 360, coalRate: 155, fuelRate: 515, rtv: 10.4, topPressure: 2.05, topGasTemp: 190, o2: 3.90, slagRate: 305, bfGas: 145 } },
    { id: 'BF5', cap: 4200, health: 'healthy', freqs: ['event', 'daily', 'fivemin'], res: '5-Minute', alarms: 4,
      base: { production: 4288, hmRate: 178.7, cokeRate: 341, coalRate: 178, fuelRate: 519, rtv: 18.6, topPressure: 2.55, topGasTemp: 171, o2: 5.12, slagRate: 276, bfGas: 262 },
      target: { production: 4200, hmRate: 175.0, cokeRate: 345, coalRate: 175, fuelRate: 520, rtv: 18.0, topPressure: 2.50, topGasTemp: 175, o2: 5.00, slagRate: 280, bfGas: 255 } }
  ];

  var DAILY_PARAMS = ['production', 'hmRate', 'cokeRate', 'coalRate', 'fuelRate'];
  var FINE_PARAMS = ['production', 'hmRate', 'cokeRate', 'coalRate', 'fuelRate', 'topPressure', 'topGasTemp', 'o2', 'slagRate', 'bfGas', 'rtv'];

  var SIG = {
    production: { sigma: 0.012, diurnal: 0.012, revert: 0.05 },
    hmRate: { sigma: 0.012, diurnal: 0.012, revert: 0.05 },
    cokeRate: { sigma: 0.006, diurnal: 0.004, revert: 0.04 },
    coalRate: { sigma: 0.010, diurnal: 0.006, revert: 0.05 },
    fuelRate: { sigma: 0.005, diurnal: 0.003, revert: 0.04 },
    rtv: { sigma: 0.014, diurnal: 0.010, revert: 0.06 },
    topPressure: { sigma: 0.009, diurnal: 0.008, revert: 0.06 },
    topGasTemp: { sigma: 0.014, diurnal: 0.016, revert: 0.05 },
    o2: { sigma: 0.012, diurnal: 0.010, revert: 0.05 },
    slagRate: { sigma: 0.007, diurnal: 0.005, revert: 0.04 },
    bfGas: { sigma: 0.013, diurnal: 0.014, revert: 0.05 }
  };
  var ANOM = {
    BF1: { cokeRate: [{ at: 0.972, w: 0.026, mag: 0.042 }], topGasTemp: [{ at: 0.968, w: 0.030, mag: 0.055 }], o2: [{ at: 0.970, w: 0.028, mag: -0.045 }] },
    BF2: { topGasTemp: [{ at: 0.86, w: 0.05, mag: 0.07 }, { at: 0.98, w: 0.02, mag: 0.05 }], production: [{ at: 0.88, w: 0.04, mag: -0.05 }] },
    BF4: { cokeRate: [{ at: 0.90, w: 0.08, mag: 0.05 }], topGasTemp: [{ at: 0.93, w: 0.06, mag: 0.09 }], production: [{ at: 0.92, w: 0.06, mag: -0.07 }] },
    BF5: { bfGas: [{ at: 0.94, w: 0.04, mag: 0.04 }] }
  };

  function times(n, step, end) { var t = new Float64Array(n); for (var i = 0; i < n; i++) t[i] = end - (n - 1 - i) * step; return t; }

  function build() {
    var D = { now: NOW, from: NOW - SPAN, param: PARAM, C: C, furnaces: FUR, s: {}, t: {} };

    FUR.forEach(function (f) {
      D.s[f.id] = {}; D.t[f.id] = {};
      var cfgFor = function (p, per) {
        var c = Object.assign({}, SIG[p], { period: per });
        var a = ANOM[f.id] && ANOM[f.id][p]; if (a) c.anoms = a;
        return c;
      };
      if (f.freqs.indexOf('daily') >= 0) {
        var nd = 90; D.t[f.id].daily = { times: times(nd, DAY, NOW - (NOW % DAY)), step: DAY };
        D.s[f.id].daily = {};
        DAILY_PARAMS.forEach(function (p) { D.s[f.id].daily[p] = walk(f.id + p + 'd', nd, f.base[p], cfgFor(p, 30)); });
      }
      if (f.freqs.indexOf('hourly') >= 0) {
        var nh = 90 * 24; D.t[f.id].hourly = { times: times(nh, HOUR, NOW - (NOW % HOUR)), step: HOUR };
        D.s[f.id].hourly = {};
        FINE_PARAMS.forEach(function (p) { D.s[f.id].hourly[p] = walk(f.id + p + 'h', nh, f.base[p], cfgFor(p, 24)); });
      }
      if (f.freqs.indexOf('fivemin') >= 0) {
        var nf = 90 * 288, step = 300e3;
        D.t[f.id].fivemin = { times: times(nf, step, NOW - (NOW % step)), step: step };
        D.s[f.id].fivemin = {};
        FINE_PARAMS.forEach(function (p) { D.s[f.id].fivemin[p] = walk(f.id + p + 'f', nf, f.base[p], cfgFor(p, 288)); });
      }
      // event-frequency series (all furnaces): irregular operational readings
      var r = mul(hash(f.id + 'evs')), et = [], n = 0, t = NOW - SPAN;
      while (t < NOW) { et.push(t); t += (2.5 + r() * 3.5) * HOUR; n++; }
      D.t[f.id].event = { times: et, step: 4 * HOUR, irregular: true };
      D.s[f.id].event = {};
      FINE_PARAMS.forEach(function (p) { D.s[f.id].event[p] = walk(f.id + p + 'e', n, f.base[p], cfgFor(p, 6)); });
    });

    /* ---------- events / alarms ---------- */
    var EV = [];
    FUR.forEach(function (f) {
      var r = mul(hash('tap' + f.id)), t = NOW - 14 * DAY, k = 1240;
      while (t < NOW) {
        var dur = Math.round(88 + r() * 52);
        EV.push({ t: t, bf: f.id, type: 'Tap', label: 'Tap #' + k + ' started', sev: 'info', param: 'Tap Status', value: 'Tapping', extra: dur + ' min' });
        EV.push({ t: t + dur * 60e3, bf: f.id, type: 'Tap', label: 'Tap #' + k + ' completed', sev: 'info', param: 'Tap Status', value: 'Closed', extra: dur + ' min' });
        t += (dur + 22 + r() * 30) * 60e3; k++;
      }
      var r2 = mul(hash('stv' + f.id)); t = NOW - 3 * DAY;
      while (t < NOW) {
        var s = 1 + Math.floor(r2() * 4);
        EV.push({ t: t, bf: f.id, type: 'Stove', label: 'Stove ' + s + ' changeover → Heating', sev: 'info', param: 'Stove Status', value: 'Heating', extra: 'Stove ' + s });
        t += (34 + r2() * 26) * 60e3;
      }
      var r3 = mul(hash('alm' + f.id)); t = NOW - 90 * DAY;
      var pool = f.health === 'critical'
        ? [['Top Gas Temp high', 'topGasTemp', 'critical'], ['Coke Rate deviation', 'cokeRate', 'high'], ['Production below target', 'production', 'high'], ['O₂ enrichment low', 'o2', 'medium'], ['Slag rate drift', 'slagRate', 'medium'], ['Top pressure fluctuation', 'topPressure', 'low']]
        : [['Top Gas Temp high', 'topGasTemp', 'high'], ['Coke Rate deviation', 'cokeRate', 'medium'], ['Top pressure fluctuation', 'topPressure', 'low'], ['BF Gas generation dip', 'bfGas', 'medium'], ['Stove changeover delayed', 'slagRate', 'low']];
      while (t < NOW) {
        var p = pool[Math.floor(r3() * pool.length)];
        var latest = D.latest ? 0 : 0;
        EV.push({ t: t, bf: f.id, type: 'Alarm', label: p[0], sev: p[2], param: PARAM[p[1]].label, value: fmt(f.base[p[1]] * (1 + (r3() - 0.3) * 0.09), PARAM[p[1]].dp) + ' ' + PARAM[p[1]].unit, extra: r3() > 0.55 ? 'Acknowledged' : 'Open' });
        t += (3 + r3() * 9) * HOUR;
      }
      if (ANOM[f.id]) Object.keys(ANOM[f.id]).forEach(function (p) {
        ANOM[f.id][p].forEach(function (a) {
          EV.push({ t: NOW - SPAN + (a.at + a.w / 2) * SPAN, bf: f.id, type: 'Anomaly', label: PARAM[p].label + (a.mag > 0 ? ' rising deviation' : ' falling deviation'), sev: Math.abs(a.mag) > 0.06 ? 'critical' : 'high', param: PARAM[p].label, value: (a.mag > 0 ? '+' : '') + (a.mag * 100).toFixed(1) + '%', extra: 'Model flagged' });
        });
      });
    });
    EV.sort(function (a, b) { return b.t - a.t; });
    D.events = EV;

    /* ---------- plant / process areas ---------- */
    var hm = 0, hmT = 0;
    FUR.forEach(function (f) { hm += f.base.production; hmT += f.target.production; });
    D.plant = {
      hotMetal: hm, hotMetalTarget: hmT,
      areas: [
        { id: 'RM', name: 'Raw Material', kpi: 'Throughput', value: 41280, unit: 'TPD', status: 'healthy', alarms: 1, perf: 99.2 },
        { id: 'CO', name: 'Coke Oven', kpi: 'Coke Push', value: 6120, unit: 'TPD', status: 'healthy', alarms: 2, perf: 98.1 },
        { id: 'BF', name: 'Blast Furnace', kpi: 'Hot Metal', value: hm, unit: 'TPD', status: 'warning', alarms: 27, perf: 96.4, primary: true },
        { id: 'SMS', name: 'Steel Melt Shop', kpi: 'Liquid Steel', value: 13120, unit: 'TPD', status: 'healthy', alarms: 6, perf: 97.6 },
        { id: 'HSM', name: 'HSM', kpi: 'Hot Rolled', value: 11640, unit: 'TPD', status: 'healthy', alarms: 4, perf: 98.4 },
        { id: 'CRM', name: 'CRM', kpi: 'Cold Rolled', value: 6480, unit: 'TPD', status: 'warning', alarms: 9, perf: 93.8 },
        { id: 'FIN', name: 'Finishing', kpi: 'Dispatch Ready', value: 5940, unit: 'TPD', status: 'healthy', alarms: 3, perf: 97.1 },
        { id: 'DSP', name: 'Dispatch', kpi: 'Despatched', value: 5780, unit: 'TPD', status: 'healthy', alarms: 0, perf: 99.0 }
      ],
      processCards: [
        { id: 'RM', name: 'Raw Material', kpi: 'Yard Throughput', value: 41280, unit: 'TPD', status: 'healthy', alarms: 1, avail: 99.1 },
        { id: 'CO', name: 'Coke Oven', kpi: 'Coke Push Rate', value: 6120, unit: 'TPD', status: 'healthy', alarms: 2, avail: 97.8 },
        { id: 'BF', name: 'Blast Furnace', kpi: 'Hot Metal', value: hm, unit: 'TPD', status: 'warning', alarms: 27, avail: 96.2, primary: true },
        { id: 'CX', name: 'Corex', kpi: 'Hot Metal', value: 2860, unit: 'TPD', status: 'healthy', alarms: 3, avail: 95.4 },
        { id: 'SMS', name: 'Steel Melt Shop', kpi: 'Liquid Steel', value: 13120, unit: 'TPD', status: 'healthy', alarms: 6, avail: 97.3 },
        { id: 'HSM', name: 'HSM', kpi: 'Hot Rolled Coil', value: 11640, unit: 'TPD', status: 'healthy', alarms: 4, avail: 98.2 },
        { id: 'CRM', name: 'CRM', kpi: 'Cold Rolled Coil', value: 6480, unit: 'TPD', status: 'warning', alarms: 9, avail: 92.6 },
        { id: 'FIN', name: 'Finishing', kpi: 'Finished Tonnes', value: 5940, unit: 'TPD', status: 'healthy', alarms: 3, avail: 97.0 },
        { id: 'BRM', name: 'Bar & Rod Mill', kpi: 'Rolled Bars', value: 3120, unit: 'TPD', status: 'healthy', alarms: 2, avail: 96.8 },
        { id: 'WRM', name: 'Wire Rod Mill', kpi: 'Wire Rod', value: 2410, unit: 'TPD', status: 'offline', alarms: 0, avail: 0 },
        { id: 'CTL', name: 'CTL', kpi: 'Cut Length', value: 1180, unit: 'TPD', status: 'healthy', alarms: 1, avail: 98.9 }
      ]
    };

    /* ---------- plant hourly aggregate (sum of BF-bearing areas) ---------- */
    var nh = 90 * 24;
    D.plantHourly = { times: D.t.BF1.hourly.times, prod: new Float64Array(nh), energy: null, water: null };
    var b1 = D.s.BF1.hourly.production, b2 = D.s.BF2.hourly.production;
    var b5 = D.s.BF5.fivemin.production, e3 = D.s.BF3.event.production, e4 = D.s.BF4.event.production;
    for (var i = 0; i < nh; i++) {
      D.plantHourly.prod[i] = (b1[i] + b2[i] + b5[Math.min(b5.length - 1, i * 12)] +
        e3[Math.min(e3.length - 1, Math.floor(i / 4))] + e4[Math.min(e4.length - 1, Math.floor(i / 4))]) * 3.94 / 24;
    }
    D.plantEnergy = walk('energy', nh, 2860, { sigma: 0.010, diurnal: 0.030, period: 24 });
    D.plantWater = walk('water', nh, 2480, { sigma: 0.011, diurnal: 0.025, period: 24 });
    D.plantDemand = walk('demand', nh, 412, { sigma: 0.012, diurnal: 0.045, period: 24 });

    /* ---------- utilities pages ---------- */
    D.water = {
      kpis: [{ k: 'Raw Water Intake', v: 59520, u: 'm³/day', t: 57800, dp: 0 },
        { k: 'Specific Consumption', v: 2.86, u: 'm³/tcs', t: 2.78, dp: 2 },
        { k: 'Recycled Water', v: 78.4, u: '%', t: 80, dp: 1 },
        { k: 'TRT Generation', v: 64.3, u: 'MW', t: 66, dp: 1 },
        { k: 'Power Plant Usage', v: 20681, u: 'm³/day', t: 20180, dp: 0 },
        { k: 'Exceptions', v: 4, u: 'open', t: 0, dp: 0 }],
      sources: [{ n: 'River Intake', v: 34468 }, { n: 'Recycled / ETP', v: 17066 }, { n: 'Bore Wells', v: 5065 }, { n: 'Rain Harvest', v: 2921 }],
      areas: [{ n: 'BF', v: 18117 }, { n: 'SMS', v: 13472 }, { n: 'HSM', v: 10467 }, { n: 'CRM', v: 6809 }, { n: 'Power', v: 8008 }, { n: 'Others', v: 2647 }],
      balance: [{ n: 'Process Use', v: 40437 }, { n: 'Evaporation Loss', v: 8659 }, { n: 'Return to ETP', v: 8113 }, { n: 'Discharge', v: 2312 }],
      series: walk('waterDaily', 90, 59520, { sigma: 0.012, diurnal: 0.010, period: 7 }),
      exceptions: [
        { a: 'BF2 Cooling Circuit', m: 'Return temperature above band', s: 'high', t: NOW - 46 * 60e3 },
        { a: 'CRM Pump House', m: 'Flow deviation vs setpoint', s: 'medium', t: NOW - 3.2 * HOUR },
        { a: 'ETP Line 2', m: 'Turbidity trending up', s: 'medium', t: NOW - 7.6 * HOUR },
        { a: 'Bore Well 4', m: 'Tag stale > 15 min', s: 'low', t: NOW - 11 * HOUR }
      ]
    };
    D.power = {
      kpis: [{ k: 'Energy Consumption', v: 68640, u: 'MWh/day', t: 67200, dp: 0 },
        { k: 'Energy per Tonne', v: 6.34, u: 'GJ/tcs', t: 6.20, dp: 2 },
        { k: 'Current Demand', v: 412, u: 'MW', t: 420, dp: 0 },
        { k: 'Peak Demand (24h)', v: 468, u: 'MW', t: 450, dp: 0 },
        { k: 'Captive Generation', v: 71.2, u: '%', t: 72, dp: 1 },
        { k: 'BF Gas Recovery', v: 926, u: 'kNm³/hr', t: 900, dp: 0 }],
      areas: [{ n: 'BF', v: 14200 }, { n: 'SMS', v: 21400 }, { n: 'HSM', v: 12800 }, { n: 'CRM', v: 8600 }, { n: 'Oxygen', v: 7200 }, { n: 'Utilities', v: 4440 }],
      flow: [{ n: 'Captive Power Plant', v: 48800 }, { n: 'Grid Import', v: 19840 }, { n: 'TRT + BF Gas', v: 12600 }],
      intensity: walk('intensity', 90, 6.34, { sigma: 0.008, diurnal: 0.006, period: 7 })
    };
    D.pdm = {
      kpis: [{ k: 'Critical Assets', v: 148, u: 'monitored', t: null, dp: 0 },
        { k: 'Predicted Failures', v: 6, u: 'next 30d', t: null, dp: 0 },
        { k: 'Avg Health Score', v: 87.4, u: '/100', t: 90, dp: 1 },
        { k: 'Assets < 30d RUL', v: 4, u: 'assets', t: 0, dp: 0 },
        { k: 'Active Alerts', v: 19, u: 'open', t: null, dp: 0 },
        { k: 'PM Compliance', v: 94.2, u: '%', t: 95, dp: 1 }],
      assets: [
        { n: 'BF4 Stove 3 Combustion Fan', a: 'Blast Furnace', h: 46, rul: 12, p: 0.72, s: 'critical', mode: 'Bearing wear' },
        { n: 'BF2 Cast House Dedusting Fan', a: 'Blast Furnace', h: 58, rul: 24, p: 0.54, s: 'critical', mode: 'Imbalance' },
        { n: 'BF1 Charging Conveyor CV-14', a: 'Blast Furnace', h: 71, rul: 41, p: 0.31, s: 'warning', mode: 'Belt misalign' },
        { n: 'Sinter Plant ID Fan 2', a: 'Raw Material', h: 74, rul: 55, p: 0.27, s: 'warning', mode: 'Erosion' },
        { n: 'BF5 Hot Blast Valve HV-2', a: 'Blast Furnace', h: 82, rul: 78, p: 0.18, s: 'warning', mode: 'Actuator drift' },
        { n: 'SMS Ladle Turret Drive', a: 'Steel Melt Shop', h: 88, rul: 120, p: 0.11, s: 'healthy', mode: 'Gearbox temp' },
        { n: 'HSM Finishing Stand F5', a: 'HSM', h: 91, rul: 165, p: 0.08, s: 'healthy', mode: 'Vibration' },
        { n: 'CRM Reversing Mill Motor', a: 'CRM', h: 93, rul: 190, p: 0.06, s: 'healthy', mode: 'Current signature' }
      ],
      pareto: [{ n: 'Bearing failure', v: 31 }, { n: 'Lubrication', v: 24 }, { n: 'Misalignment', v: 18 }, { n: 'Overheating', v: 12 }, { n: 'Sensor fault', v: 9 }, { n: 'Other', v: 6 }],
      rul: walk('rulTrend', 90, 62, { sigma: 0.012, drift: -0.28 }),
      plan: [
        { n: 'BF4 Stove 3 fan — bearing replacement', w: 'Week 38', s: 'critical' },
        { n: 'BF2 dedusting fan — balancing', w: 'Week 39', s: 'critical' },
        { n: 'BF1 CV-14 — belt alignment', w: 'Week 40', s: 'warning' },
        { n: 'Sinter ID Fan 2 — impeller check', w: 'Week 41', s: 'warning' }
      ]
    };
    D.tags = {
      total: 18432, online: 17612, offline: 214, stale: 312, bad: 294, delay: 42,
      matrix: [
        { a: 'Blast Furnace', total: 6140, online: 5902, offline: 62, stale: 98, bad: 78 },
        { a: 'Raw Material', total: 2210, online: 2148, offline: 24, stale: 22, bad: 16 },
        { a: 'Coke Oven', total: 1980, online: 1902, offline: 31, stale: 26, bad: 21 },
        { a: 'Steel Melt Shop', total: 3120, online: 2986, offline: 41, stale: 52, bad: 41 },
        { a: 'HSM / CRM', total: 2840, online: 2724, offline: 33, stale: 48, bad: 35 },
        { a: 'Utilities', total: 2142, online: 1950, offline: 23, stale: 66, bad: 103 }
      ],
      freshness: [{ n: '< 1 min', v: 15840 }, { n: '1–5 min', v: 1712 }, { n: '5–15 min', v: 568 }, { n: '> 15 min', v: 312 }]
    };

    /* ---------- accessors ---------- */
    var RANGE_H = { '1H': 1, '4H': 4, '8H': 8, '24H': 24, '7D': 168, '30D': 720, '90D': 2160 };
    D.rangeHours = RANGE_H;

    D.freqOf = function (bf, hours) {
      var s = D.s[bf];
      if (hours <= 8 && s.fivemin) return 'fivemin';
      if (s.hourly && hours <= 720) return 'hourly';
      if (s.fivemin && hours <= 168) return 'fivemin';
      if (s.daily && hours >= 24) return 'daily';
      if (s.hourly) return 'hourly';
      if (s.fivemin) return 'fivemin';
      return 'event';
    };
    D.freqLabel = { fivemin: '5-minute', hourly: 'Hourly', daily: 'Daily', event: 'Event' };

    D.series = function (bf, param, rk, maxPts) {
      var hours = RANGE_H[rk] || 24, freq = D.freqOf(bf, hours);
      var col = D.s[bf][freq] && D.s[bf][freq][param];
      if (!col) { freq = 'event'; col = D.s[bf].event[param]; }
      var tm = D.t[bf][freq].times, step = D.t[bf][freq].step;
      var cutoff = NOW - hours * HOUR, i0 = 0;
      for (var i = tm.length - 1; i >= 0; i--) { if (tm[i] < cutoff) { i0 = i + 1; break; } }
      var n = tm.length - i0; if (n < 2) { i0 = Math.max(0, tm.length - 2); n = tm.length - i0; }
      maxPts = maxPts || 170;
      var vals = [], labels = [], stamps = [];
      if (n <= maxPts) {
        for (var j = i0; j < tm.length; j++) { vals.push(col[j]); labels.push(labelFor(tm[j], step)); stamps.push(stampLabel(tm[j])); }
      } else {
        var b = Math.ceil(n / maxPts);
        for (var k = i0; k < tm.length; k += b) {
          var sum = 0, c = 0;
          for (var m = k; m < Math.min(k + b, tm.length); m++) { sum += col[m]; c++; }
          vals.push(sum / c); labels.push(labelFor(tm[k], b * step > DAY ? DAY : step)); stamps.push(stampLabel(tm[k]));
        }
      }
      return { vals: vals, labels: labels, stamps: stamps, freq: freq, freqLabel: D.freqLabel[freq], count: n, param: param };
    };

    D.latest = function (bf, param) {
      var s = D.s[bf], freq = s.fivemin ? 'fivemin' : (s.hourly ? 'hourly' : (s.daily && DAILY_PARAMS.indexOf(param) >= 0 ? 'daily' : 'event'));
      var col = s[freq] && s[freq][param]; if (!col) { freq = 'event'; col = s.event[param]; }
      var tm = D.t[bf][freq].times;
      return { v: col[col.length - 1], t: tm[tm.length - 1], freq: freq, freqLabel: D.freqLabel[freq] };
    };
    D.fur = function (id) { for (var i = 0; i < FUR.length; i++) if (FUR[i].id === id) return FUR[i]; return FUR[0]; };
    return D;
  }

  /* ---------------- chart builders ---------------- */
  function line(cfg) {
    var w = 1000, h = cfg.h || 300, pl = cfg.pl == null ? 66 : cfg.pl, pr = 16, pt = 16, pb = cfg.pb == null ? 30 : cfg.pb;
    var ser = (cfg.series || []).filter(function (s) { return s.vals && s.vals.length; });
    var mn = Infinity, mx = -Infinity, i, j;
    ser.forEach(function (s) { for (var i = 0; i < s.vals.length; i++) { var v = s.vals[i]; if (v < mn) mn = v; if (v > mx) mx = v; } });
    (cfg.targets || []).forEach(function (t) { mn = Math.min(mn, t.value); mx = Math.max(mx, t.value); });
    (cfg.bands || []).forEach(function (b) { mn = Math.min(mn, b.from); mx = Math.max(mx, b.to); });
    if (!isFinite(mn)) { mn = 0; mx = 1; }
    if (mx - mn < 1e-9) { mx = mn + 1; }
    var pad = (mx - mn) * 0.14; mn -= pad; mx += pad;
    var n = 2; ser.forEach(function (s) { n = Math.max(n, s.vals.length); });
    var X = function (i) { return pl + (w - pl - pr) * (n < 2 ? 0 : i / (n - 1)); };
    var Y = function (v) { return pt + (h - pt - pb) * (1 - (v - mn) / (mx - mn)); };
    var dp = cfg.dp == null ? 1 : cfg.dp;

    var grid = [];
    for (i = 0; i <= 4; i++) { var gv = mn + (mx - mn) * i / 4; grid.push({ y: +Y(gv).toFixed(1), ty: +(Y(gv) + 5).toFixed(1), x1: pl, x2: w - pr, label: fmt(gv, dp) }); }

    var labels = cfg.labels || [];
    var xticks = [], ticks = Math.min(6, n);
    for (i = 0; i < ticks; i++) {
      var idx = Math.round(i * (n - 1) / (ticks - 1 || 1));
      xticks.push({ x: +X(idx).toFixed(1), y: h - 8, label: labels[idx] || '' });
    }

    var bands = (cfg.bands || []).map(function (b) {
      var y1 = Y(b.to), y2 = Y(b.from);
      return { x: pl, w: w - pl - pr, y: +y1.toFixed(1), h: +Math.max(1, y2 - y1).toFixed(1), fill: b.fill };
    });
    var targets = (cfg.targets || []).map(function (t) {
      return { y: +Y(t.value).toFixed(1), x1: pl, x2: w - pr, color: t.color || C.tgt, label: t.label || '', lx: w - pr - 4, ly: +(Y(t.value) - 6).toFixed(1) };
    });

    var out = [], legend = [], hoverRows = [];
    ser.forEach(function (s) {
      var d = '', a = '';
      for (j = 0; j < s.vals.length; j++) d += (j ? 'L' : 'M') + X(j).toFixed(1) + ' ' + Y(s.vals[j]).toFixed(1) + ' ';
      if (s.area) a = d + 'L' + X(s.vals.length - 1).toFixed(1) + ' ' + (h - pb).toFixed(1) + ' L' + X(0).toFixed(1) + ' ' + (h - pb).toFixed(1) + ' Z';
      out.push({ d: d, area: a, color: s.color || C.a1, width: s.width || 2, dash: s.dash || '', fill: s.fill || 'none' });
      legend.push({ label: s.label, color: s.color || C.a1, dash: s.dash || '' });
      hoverRows.push({ label: s.label, color: s.color || C.a1, vals: s.vals.map(function (v) { return fmt(v, dp) + (cfg.unit ? ' ' + cfg.unit : ''); }) });
    });
    (cfg.targets || []).forEach(function (t) { legend.push({ label: t.label, color: t.color || C.tgt, dash: '5 4' }); });

    var markers = (cfg.markers || []).map(function (m) {
      return { cx: +X(m.i).toFixed(1), cy: +Y(m.v).toFixed(1), color: m.color || C.crit, label: m.label || '' };
    });

    return {
      w: w, h: h, vb: '0 0 ' + w + ' ' + h, labelX: pl - 8, baseY: h - pb, plotX: pl, plotW: w - pl - pr,
      grid: grid, xticks: xticks, bands: bands, targets: targets, series: out, legend: legend, markers: markers,
      hover: { n: n, X0: pl, X1: w - pr, labels: cfg.stamps || labels, rows: hoverRows }
    };
  }

  function spark(vals, w, h, color) {
    if (!vals || !vals.length) return '';
    var mn = Infinity, mx = -Infinity, i;
    for (i = 0; i < vals.length; i++) { if (vals[i] < mn) mn = vals[i]; if (vals[i] > mx) mx = vals[i]; }
    if (mx - mn < 1e-9) mx = mn + 1;
    var d = '';
    for (i = 0; i < vals.length; i++) d += (i ? 'L' : 'M') + (w * i / (vals.length - 1)).toFixed(1) + ' ' + (h - (h - 2) * (vals[i] - mn) / (mx - mn) - 1).toFixed(1) + ' ';
    return d;
  }

  function bars(items, opts) {
    opts = opts || {};
    var max = 0;
    items.forEach(function (b) { max = Math.max(max, b.value, b.target || 0); });
    max *= 1.06;
    return items.map(function (b, i) {
      var pct = max ? (b.value / max) * 100 : 0;
      var tp = b.target ? (b.target / max) * 100 : null;
      var col = b.color || C.a1;
      return {
        label: b.label, display: b.display != null ? b.display : fmt(b.value, opts.dp == null ? 1 : opts.dp) + (opts.unit ? ' ' + opts.unit : ''),
        rank: b.rank || '', note: b.note || '',
        fillStyle: { position: 'absolute', left: 0, top: 0, bottom: 0, width: pct.toFixed(2) + '%', background: col, opacity: b.dim ? 0.42 : 0.9, borderRadius: '3px' },
        targetStyle: tp == null ? { display: 'none' } : { position: 'absolute', left: tp.toFixed(2) + '%', top: '-2px', bottom: '-2px', width: '2px', background: C.tgt, opacity: 0.85 }
      };
    });
  }

  var cache = null;
  window.ICCCD = {
    get: function () { if (!cache) cache = build(); return cache; },
    line: line, spark: spark, bars: bars, fmt: fmt, C: C, PARAM: PARAM,
    clockLabel: clockLabel, dateLabel: dateLabel, stampLabel: stampLabel
  };
})();
