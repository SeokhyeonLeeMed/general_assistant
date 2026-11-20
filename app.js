// 내 비서 — 회계사 에이전트·영양사 에이전트가 만든 자료를 한곳에서 본다.
// 데이터: window.SEC_DATA (로컬판은 data.js, 공개판은 boot.js가 풀어서 넣는다)
(function () {
  "use strict";
  var D = window.SEC_DATA, F = D.fin, N = D.nut;
  var app = document.getElementById("app");

  // ───── 도구 ─────
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function won(n) { return n == null || n === "" ? "" : (typeof n === "number" ? Math.round(n).toLocaleString("ko-KR") + "원" : esc(n)); }
  function num(n) { return typeof n === "number" ? Math.round(n).toLocaleString("ko-KR") : esc(n); }
  function man(n) { if (!n) return "0"; var v = n / 10000; return (Math.abs(v) >= 100 ? Math.round(v).toLocaleString("ko-KR") : (Math.round(v * 10) / 10).toLocaleString("ko-KR")) + "만"; }
  function sgn(n) { return n < 0 ? "neg" : ""; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem("biseo_" + k) || "null"); localStorage.setItem("biseo_" + k, JSON.stringify(v)); } catch (e) { return null; } }
  function h(tag, attrs, html) { return "<" + tag + (attrs ? " " + attrs : "") + ">" + (html || "") + "</" + tag + ">"; }
  var TODAY = new Date();
  var WD = "일월화수목금토";
  function md(d) { return (d.getMonth() + 1) + "/" + d.getDate(); }

  // 표 하나 (숫자 칸은 오른쪽 정렬, '합계'가 있는 줄은 굵게)
  function table(head, rows, opt) {
    opt = opt || {};
    var skip = opt.skip || [];
    var cols = head.map(function (_, i) { return i; }).filter(function (i) { return skip.indexOf(i) < 0; });
    var isNum = cols.map(function (i) { return rows.some(function (r) { return typeof r[i] === "number"; }); });
    var t = "<thead><tr>" + cols.map(function (i, k) { return '<th class="' + (isNum[k] ? "n" : "") + '">' + esc(head[i] || "") + "</th>"; }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r) {
      var sum = r.some(function (c) { return typeof c === "string" && /^(합계|생활비 합계|순자산)$/.test(c); });
      var cls = (opt.rowClass && opt.rowClass(r)) || (sum ? "sum" : "");
      t += '<tr class="' + cls + '">' + cols.map(function (i, k) {
        var c = r[i];
        if (opt.fmt && opt.fmt[i]) return '<td class="n">' + opt.fmt[i](c) + "</td>";
        if (typeof c === "number") return '<td class="n ' + sgn(c) + '">' + num(c) + "</td>";
        return "<td>" + esc(c == null ? "" : c) + "</td>";
      }).join("") + "</tr>";
    });
    var long = rows.some(function (r) { return typeof r[cols[0]] === "string" && r[cols[0]].length > 14; });
    return '<div class="tw' + (long ? " wrap1" : "") + '"><table>' + t + "</tbody></table></div>";
  }

  // ───── 차트 (SVG + 마우스를 올리면 값) ─────
  var tipEl;
  function tipShow(wrap, x, y, html) {
    if (!tipEl || tipEl.parentNode !== wrap) { tipEl = document.createElement("div"); tipEl.className = "tip"; wrap.appendChild(tipEl); }
    tipEl.innerHTML = html; tipEl.style.display = "block";
    var w = wrap.clientWidth, tw = tipEl.offsetWidth;
    tipEl.style.left = Math.max(0, Math.min(w - tw, x - tw / 2)) + "px";
    tipEl.style.top = Math.max(0, y - tipEl.offsetHeight - 10) + "px";
  }
  function tipHide() { if (tipEl) tipEl.style.display = "none"; }
  function nice(max) { var p = Math.pow(10, Math.floor(Math.log10(max))), s = [1, 2, 2.5, 5, 10]; for (var i = 0; i < s.length; i++) if (s[i] * p * 4 >= max) return s[i] * p; return 10 * p; }
  function tipRow(color, name, v) { return '<div class="row"><span><i style="background:' + color + '"></i>' + esc(name) + "</span><span>" + won(v) + "</span></div>"; }

  // 묶은 막대: cats = 이름 목록, series = [{name, color, vals}]
  function barChart(id, cats, series) {
    var W = chartW(), H = 240, L = 44, R = 8, T = 10, B = 28;
    var max = 0; series.forEach(function (s) { s.vals.forEach(function (v) { max = Math.max(max, v); }); });
    var step = nice(max), top = Math.ceil(max / step) * step;
    var y = function (v) { return T + (H - T - B) * (1 - v / top); };
    var gw = (W - L - R) / cats.length, bw = Math.min(28, (gw * 0.6) / series.length);
    var g = '<g class="grid">';
    for (var v = 0; v <= top; v += step) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + man(v) + "</text>";
    g += "</g>";
    var bars = "", hits = "";
    cats.forEach(function (c, i) {
      var cx = L + gw * i + gw / 2, x0 = cx - (bw * series.length + 2 * (series.length - 1)) / 2;
      series.forEach(function (s, k) {
        var v = s.vals[i], x = x0 + k * (bw + 2), yy = y(v), hgt = y(0) - yy, r = Math.min(4, hgt);
        bars += '<path fill="' + s.color + '" d="M' + x + "," + y(0) + "V" + (yy + r) + "q0,-" + r + " " + r + ",-" + r + "h" + (bw - 2 * r) + "q" + r + ",0 " + r + "," + r + "V" + y(0) + 'Z"/>';
      });
      bars += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(c) + "</text>";
      hits += '<rect data-i="' + i + '" x="' + (L + gw * i) + '" y="' + T + '" width="' + gw + '" height="' + (H - T - B) + '" fill="transparent"/>';
    });
    var html = '<div class="legend">' + series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + "</span>"; }).join("") + "</div>" +
      '<div class="chart" id="' + id + '"><svg viewBox="0 0 ' + W + " " + H + '" role="img">' + g + '<line class="base" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>' + bars + hits + "</svg></div>";
    later(function () {
      var wrap = document.getElementById(id); if (!wrap) return;
      wrap.querySelectorAll("rect[data-i]").forEach(function (r) {
        r.addEventListener("mousemove", function (e) {
          var i = +r.dataset.i, b = wrap.getBoundingClientRect();
          tipShow(wrap, e.clientX - b.left, e.clientY - b.top, "<b>" + esc(cats[i]) + "</b>" + series.map(function (s) { return tipRow(s.color, s.name, s.vals[i]); }).join(""));
        });
        r.addEventListener("mouseleave", tipHide);
      });
    });
    return html;
  }

  function chartW() { return Math.max(320, Math.min(1000, (app.clientWidth || 640) - 82)); }
  // 가로 막대 + 목표 눈금 (HTML: 휴대폰에서도 글자 크기 유지)
  function hbarChart(id, items, color) { // items: [{name, v, target}]
    var max = 0; items.forEach(function (it) { max = Math.max(max, it.v, it.target || 0); });
    var pc = function (v) { return (v / max * 100).toFixed(2) + "%"; };
    var rows = items.map(function (it) {
      var over = it.target && it.v > it.target;
      return '<div class="hb" title="' + esc(it.name) + " 평균 " + won(it.v) + (it.target ? " · 목표 " + won(it.target) : "") + '"><span class="hb-n">' + esc(it.name) + '</span><span class="hb-t"><i style="width:' + pc(it.v) + ";background:" + color + '"></i>' +
        (it.target ? '<b style="left:' + pc(it.target) + '"></b>' : "") + '</span><span class="hb-v">' + man(it.v) + (it.target ? ' <small class="' + (over ? "neg" : "pos") + '">/ ' + man(it.target) + "</small>" : "") + "</span></div>";
    }).join("");
    return '<div class="legend"><span><i style="background:' + color + '"></i>8~10월 평균</span><span><i class="line" style="background:var(--ink);width:3px;height:12px;vertical-align:-1px"></i>목표 예산</span></div><div class="hbars" id="' + id + '">' + rows + "</div>";
  }

  // 선 그래프(한 계열) + 기준선
  function lineChart(id, labels, vals, color, name, floor, floorName) {
    var W = chartW(), H = 240, L = 44, R = 10, T = 10, B = 28;
    var max = Math.max.apply(null, vals.concat([floor || 0])), step = nice(max), top = Math.ceil(max / step) * step;
    var x = function (i) { return L + (W - L - R) * i / (labels.length - 1); };
    var y = function (v) { return T + (H - T - B) * (1 - v / top); };
    var g = '<g class="grid">';
    for (var v = 0; v <= top; v += step) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + man(v) + "</text>";
    g += "</g>";
    var xl = "";
    var every = Math.max(1, Math.ceil(labels.length / ((W - L) / 64)));
    labels.forEach(function (l, i) { if (i % every === 0) xl += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + "</text>"; });
    var path = vals.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1); }).join("");
    var fl = floor ? '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(floor) + '" y2="' + y(floor) + '" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>' : "";
    var lo = vals.indexOf(Math.min.apply(null, vals));
    var ann = '<circle cx="' + x(lo) + '" cy="' + y(vals[lo]) + '" r="4" fill="' + color + '" stroke="var(--surface)" stroke-width="2"/><text x="' + x(lo) + '" y="' + (y(vals[lo]) + 18) + '" text-anchor="middle" style="fill:var(--ink-2)">최저 ' + man(vals[lo]) + "</text>";
    later(function () {
      var wrap = document.getElementById(id); if (!wrap) return;
      var svg = wrap.querySelector("svg"), cross = svg.querySelector(".cross"), dot = svg.querySelector(".hdot");
      svg.addEventListener("mousemove", function (e) {
        var b = svg.getBoundingClientRect(), px = (e.clientX - b.left) * W / b.width;
        var i = Math.max(0, Math.min(labels.length - 1, Math.round((px - L) / (W - L - R) * (labels.length - 1))));
        cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.style.display = "";
        dot.setAttribute("cx", x(i)); dot.setAttribute("cy", y(vals[i])); dot.style.display = "";
        tipShow(wrap, x(i) * b.width / W, y(vals[i]) * b.height / H, "<b>" + esc(labels[i]) + "</b>" + tipRow(color, name, vals[i]));
      });
      svg.addEventListener("mouseleave", function () { tipHide(); cross.style.display = "none"; dot.style.display = "none"; });
    });
    return '<div class="legend"><span><i class="line" style="background:' + color + '"></i>' + esc(name) + "</span>" + (floor ? '<span><i class="dash"></i>' + esc(floorName) + "</span>" : "") + "</div>" +
      '<div class="chart" id="' + id + '"><svg viewBox="0 0 ' + W + " " + H + '">' + g + xl + fl + '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/>' + ann +
      '<line class="cross" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--axis)" style="display:none"/><circle class="hdot" r="5" fill="' + color + '" stroke="var(--surface)" stroke-width="2" style="display:none"/></svg></div>';
  }
  var queue = [];
  function later(fn) { queue.push(fn); }
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

  // ───── 데이터 가공 ─────
  var monthsInTx = [];
  F.tx.forEach(function (t) { if (monthsInTx.indexOf(t.m) < 0) monthsInTx.push(t.m); });
  function txSum(filter) { var s = 0; F.tx.forEach(function (t) { if (filter(t)) s += t.a; }); return s; }
  var lastM = monthsInTx[monthsInTx.length - 1];
  var lastDate = F.tx.reduce(function (a, t) { return t.d > a ? t.d : a; }, "");
  function sheet(name) { for (var i = 0; i < N.sheets.length; i++) if (N.sheets[i].name === name) return N.sheets[i]; return null; }
  function firstTable(sh) { if (!sh) return null; for (var i = 0; i < sh.blocks.length; i++) if (sh.blocks[i].t === "table") return sh.blocks[i]; return null; }
  function rowDate(label) { // "수 11/18" → Date
    var m = /(\d{1,2})\/(\d{1,2})/.exec(label || ""); if (!m) return null;
    return new Date(TODAY.getFullYear(), +m[1] - 1, +m[2]);
  }
  function sameDay(a, b) { return a && b && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  var mealT = firstTable(sheet("식단표"));
  var budgetT = firstTable(sheet("예산"));
  function budgetVal(label) { if (!budgetT) return null; for (var i = 0; i < budgetT.rows.length; i++) if (String(budgetT.rows[i][0]).indexOf(label) === 0) return budgetT.rows[i][1]; return null; }
  function assumeVal(label) { for (var i = 0; i < F.assume.length; i++) if (F.assume[i][0] === label) return F.assume[i][1]; return null; }

  // ───── 화면: 홈 ─────
  function dayCard(r, head) {
    var d = rowDate(r[0]), today = sameDay(d, TODAY), past = d && !today && d < TODAY;
    var col = function (n) { return head.indexOf(n); };
    var cost = r[col("그날 밖에서 쓸 식비(원)")];
    return '<article class="day' + (today ? " today" : "") + (past ? " past" : "") + '"><header><b>' + esc(r[0]) + "</b>" + (today ? '<span class="badge">오늘</span>' : "") +
      '<span class="sch">' + esc(r[col("일정")] || "") + "</span>" + (typeof cost === "number" ? '<span class="cost">밖에서 쓸 돈 ' + won(cost) + "</span>" : "") + "</header>" +
      '<div class="meals">' + ["아침", "점심", "저녁"].map(function (k) { return "<div><span>" + k + "</span>" + esc(r[col(k)] || "-") + "</div>"; }).join("") + "</div>" +
      (r[col("비고")] ? '<div class="memo">' + esc(r[col("비고")]) + "</div>" : "") + "</article>";
  }
  function pageHome() {
    var o = "";
    var hello = (TODAY.getMonth() + 1) + "월 " + TODAY.getDate() + "일 " + WD[TODAY.getDay()] + "요일";
    o += '<div class="hero"><p class="eyebrow">' + TODAY.getFullYear() + "년 · 오늘</p><h1>" + hello + '</h1><p class="sub">회계사 에이전트와 영양사 에이전트가 정리한 내용입니다.</p></div>';

    // 오늘 식단
    var todayRow = null, nextRow = null;
    if (mealT) mealT.rows.forEach(function (r) { var d = rowDate(r[0]); if (!d) return; if (sameDay(d, TODAY)) todayRow = r; else if (d > TODAY && !nextRow) nextRow = r; });
    o += '<h2><span class="who nut">영양사</span> 오늘 먹을 것</h2>';
    if (todayRow) o += dayCard(todayRow, mealT.head);
    else o += '<div class="card"><p style="margin:0">오늘은 식단 계획 기간(' + esc(N.period) + ") 밖입니다." + (nextRow ? " 다음 계획: " + esc(nextRow[0]) : " 영양사 에이전트에게 새 기간 계획을 맡기면 여기에 나옵니다.") + "</p></div>";
    if (nextRow && todayRow) o += '<p class="note">내일 ' + esc(nextRow[0]) + ": 아침 " + esc(nextRow[mealT.head.indexOf("아침")] || "-") + " · 점심 " + esc(nextRow[mealT.head.indexOf("점심")] || "-") + "</p>";

    // 숫자 한눈에
    var bal = F.assets[0], net = F.assets.filter(function (a) { return a[0] === "순자산"; })[0];
    var food = -txSum(function (t) { return t.m === lastM && t.c === "식비"; });
    var plan = budgetVal("합계"), goal = budgetVal("목표 (");
    o += "<h2>숫자 한눈에</h2><div class=\"grid g4\">";
    o += '<div class="card kpi fin"><span>' + esc(bal[0]) + "</span><b>" + won(bal[1]) + "</b><small>" + esc(F.assetsTitle.replace(/^재무상태\s*/, "")) + " 기준</small></div>";
    if (net) o += '<div class="card kpi fin"><span>순자산</span><b>' + won(net[1]) + "</b><small>보증금 포함, 학자금대출 뺌</small></div>";
    o += '<div class="card kpi fin"><span>' + esc(lastM) + " 식비 (기록된 날까지)</span><b>" + won(food) + "</b><small>~" + esc(lastDate.slice(5).replace("-", "/")) + " · 목표 월 46만</small></div>";
    if (D.pf && D.pf.summary.total != null) o += '<div class="card kpi inv" data-go="#pf"><span>투자 평가액</span><b>' + won(D.pf.summary.total) + "</b><small>투자 손익 " + signed(D.pf.summary.invPnl, "KRW") + " " + pct(D.pf.summary.retPct) + "</small></div>";
    if (plan != null) o += '<div class="card kpi nut"><span>이번 식단 기간 식비 계획</span><b>' + won(plan) + "</b><small>목표 " + won(goal) + " 안</small></div>";
    o += "</div>";

    // 할 일
    var shop = shopItems(), done = shop.filter(function (s) { return s.done; }).length;
    o += "<h2>할 일과 메모</h2><div class=\"grid g2\">";
    o += '<div class="card"><h3><span class="who nut">영양사</span></h3><ul class="plain">' +
      (shop.length ? '<li><a href="#meal/장보기">장보기 목록</a> ' + done + "/" + shop.length + " 챙김</li>" : "") +
      N.todo.slice(0, 3).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>";
    o += '<div class="card"><h3><span class="who fin">회계사</span></h3><ul class="plain">' +
      F.advice.slice(0, 4).map(function (a) { return '<li><a href="#fin/권고">' + esc(a.title) + "</a></li>"; }).join("") + "</ul></div>";
    o += "</div>";

    o += '<h2><span class="who fin">회계사</span> 핵심 결론</h2><div class="card"><ol class="concl">' + F.conclusions.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ol></div>";
    return o;
  }

  // ───── 화면: 가계 (회계사) ─────
  var FIN_TABS = ["요약", "월별", "지출 구조", "장기 계획", "권고"];
  function pageFin(sub) {
    sub = FIN_TABS.indexOf(sub) >= 0 ? sub : "요약";
    var o = '<span class="who fin">회계사 에이전트</span><h1>' + esc(F.title) + '</h1><p class="sub">' + esc(F.meta) + " · " + esc(F.reportFile) + "</p>";
    o += '<div class="chips">' + FIN_TABS.map(function (t) { return '<button data-go="#fin/' + t + '" class="' + (t === sub ? "on" : "") + '">' + t + "</button>"; }).join("") + "</div>";
    if (sub === "요약") {
      o += '<div class="card"><ol class="concl">' + F.conclusions.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ol></div>";
      var inc = F.months.filter(function (m) { return m.label === "수입"; })[0], exp = F.months.filter(function (m) { return m.label === "지출"; })[0];
      var n = F.monthsHead.length - 1; // 평균 칸 제외
      o += "<h2>달마다 수입과 지출</h2><div class=\"card\">" + barChart("c-month", F.monthsHead.slice(0, n), [
        { name: "수입", color: css("--s1"), vals: inc.v.slice(0, n) }, { name: "지출", color: css("--s2"), vals: exp.v.slice(0, n) }]) +
        (F.monthsNote ? '<p class="note">' + esc(F.monthsNote) + "</p>" : "") + "</div>";
      o += '<div style="margin-top:12px">' + table(["항목"].concat(F.monthsHead), F.months.map(function (m) { return [m.label].concat(m.v); })) + "</div>";
      o += "<h2>" + esc(F.assetsTitle) + "</h2><div class=\"grid g2\"><div>" + table(["항목", "금액"], F.assets) + "</div><div class=\"card\">" +
        (F.assetsNotes || []).map(function (x) { return '<p style="margin:0 0 8px">' + esc(x) + "</p>"; }).join("") + "</div></div>";
      o += "<h2>잔액 대조</h2>" + table(["항목", "금액"], F.recon) + (F.reconNotes || []).map(function (x) { return '<p class="note">' + esc(x) + "</p>"; }).join("");
    } else if (sub === "월별") {
      F.monthly.slice().reverse().forEach(function (m) {
        o += '<h2>' + esc(m.name) + '</h2><div class="grid g4">' + m.nums.map(function (x) {
          return '<div class="card kpi"><span>' + esc(x[0]) + '</span><b class="' + sgn(x[1]) + '">' + won(x[1]) + "</b></div>";
        }).join("") + "</div>";
        o += '<div class="grid g2" style="margin-top:12px"><div class="card"><h3>점검</h3><ul class="plain">' + m.notes.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div><div>" +
          table(["지출 상위 세부분류", "금액", "비중"], m.top, { fmt: { 2: function (v) { return typeof v === "number" ? Math.round(v * 1000) / 10 + "%" : ""; } } }) + "</div></div>";
      });
    } else if (sub === "지출 구조") {
      o += '<p class="sub">' + esc(F.structNote) + "</p>";
      var hd = F.structHead, ia = hd.indexOf("8~10월 평균"), it = hd.indexOf("목표 예산");
      var items = F.struct.filter(function (r) { return typeof r[it] === "number" && r[0] !== "생활비 합계" && r[0] !== "예비비"; })
        .map(function (r) { return { name: r[0], v: r[ia], target: r[it] }; });
      o += '<div class="card">' + hbarChart("c-struct", items, css("--s1")) + "</div>";
      o += '<div style="margin-top:12px">' + table(hd, F.struct) + "</div>" + (F.structNote2 ? '<p class="note">' + esc(F.structNote2) + "</p>" : "");
      o += "<h2>식비 세부</h2>" + table(F.foodHead, F.food) + (F.foodNote ? '<p class="note">' + esc(F.foodNote) + "</p>" : "");
    } else if (sub === "장기 계획") {
      o += '<p class="sub">' + esc(F.planTitle) + "</p>";
      var H = F.planHead, ib = H.indexOf("월말 잔액");
      var labels = F.plan.map(function (r) { return String(r[0]).replace(/\s*\(.*\)/, ""); });
      var floor = assumeVal("비상금 하한");
      o += '<div class="card">' + lineChart("c-plan", labels, F.plan.map(function (r) { return r[ib]; }), css("--s1"), "월말 잔액", floor, "비상금 하한 " + man(floor || 0)) + "</div>";
      var keyRows = ["가장 낮은 월말 잔액", "끝 달 잔액", "생활비 대출을 받는 횟수", "끝 달 학자금대출 잔액"];
      o += '<div class="grid g4" style="margin-top:12px">' + keyRows.map(function (k) {
        var v = assumeVal(k); return v == null ? "" : '<div class="card kpi"><span>' + k + "</span><b>" + (k.indexOf("횟수") >= 0 ? v + "번" : won(v)) + "</b></div>";
      }).join("") + "</div>";
      o += "<h2>대출을 어떻게 쓸지</h2>" + table(F.pathsHead, F.paths, { rowClass: function (r) { return /300만/.test(r[0]) && /한 번/.test(r[1]) ? "today" : ""; } }) +
        '<p class="note">파란 줄이 권고안입니다. ' + esc(F.pathsNote || "") + "</p>";
      o += "<h2>가정</h2>" + table(["항목", "값", "설명"], F.assume.filter(function (a) { return keyRows.indexOf(a[0]) < 0; }).map(function (a) {
        var v = a[1]; if (typeof v === "number" && v > 0 && v < 1) v = (Math.round(v * 1000) / 10) + "%"; else if (typeof v === "string" && /^\d{4}-\d\d-01$/.test(v)) v = v.slice(0, 7);
        return [a[0], v, a[2]];
      }));
      o += '<h2>달마다</h2><details class="more-table"><summary>달별 표 펼치기 (' + F.plan.length + "개월)</summary>" + table(H, F.plan, { skip: [1, 2] }) + "</details>";
      o += '<ul class="plain note">' + F.planNotes.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
    } else if (sub === "권고") {
      o += '<div class="adv">' + F.advice.map(function (a, i) {
        return "<details" + (i < 2 ? " open" : "") + '><summary><span class="no">' + esc(a.no) + "</span><b>" + esc(a.title) + '</b><span class="ef">' + esc(a.effect || "") + '</span></summary><div class="body">' + esc(a.body) + "</div></details>";
      }).join("") + "</div>";
      o += "<h2>" + esc(F.foodHowTitle || "식비 실행 방법") + "</h2>" + table(["끼니·항목", "방법 · 예산", "요령"], F.foodHow);
    }
    return o;
  }

  // ───── 화면: 거래내역 ─────
  var txState = { m: "", c: "", q: "", n: 100 };
  function pageTx() {
    var cats = []; F.tx.forEach(function (t) { if (cats.indexOf(t.c) < 0) cats.push(t.c); });
    var o = '<span class="who fin">회계사 에이전트</span><h1>거래내역</h1><p class="sub">' + F.tx.length + "건 · 토스 스크린샷에서 옮겨 분류한 것. 이체는 집계에서 빠집니다.</p>";
    o += '<div class="filters"><select id="fm"><option value="">모든 달</option>' + monthsInTx.map(function (m) { return "<option" + (m === txState.m ? " selected" : "") + ">" + m + "</option>"; }).join("") + "</select>" +
      '<select id="fc"><option value="">모든 분류</option>' + cats.map(function (c) { return "<option" + (c === txState.c ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select>" +
      '<input id="fq" type="search" placeholder="내용·세부분류·비고 검색" value="' + esc(txState.q) + '"></div><div id="txout"></div>';
    later(function () {
      function upd() {
        txState.m = document.getElementById("fm").value; txState.c = document.getElementById("fc").value; txState.q = document.getElementById("fq").value.trim();
        var q = txState.q.toLowerCase();
        var list = F.tx.filter(function (t) {
          return (!txState.m || t.m === txState.m) && (!txState.c || t.c === txState.c) &&
            (!q || [t.n, t.s, t.memo, t.c].join(" ").toLowerCase().indexOf(q) >= 0);
        }).reverse();
        var inc = 0, out = 0; list.forEach(function (t) { if (t.c === "이체") return; if (t.a > 0) inc += t.a; else out -= t.a; });
        var html = '<div class="txsum"><span>' + list.length + '건</span><span>들어온 돈 <b class="num">' + won(inc) + '</b></span><span>나간 돈 <b class="num">' + won(out) + "</b></span></div>";
        html += table(["날짜", "분류", "세부분류", "내용", "금액", "비고"], list.slice(0, txState.n).map(function (t) {
          return [t.d.slice(5).replace("-", "/") + " " + t.w, t.c, t.s, t.n, t.a, t.memo];
        }), { fmt: { 4: function (v) { return '<span class="' + (v > 0 ? "pos" : "") + '">' + (v > 0 ? "+" : "") + num(v) + "</span>"; } } });
        if (list.length > txState.n) html += '<button class="iconbtn more" id="txmore">더 보기 (' + (list.length - txState.n) + "건 남음)</button>";
        document.getElementById("txout").innerHTML = html;
        var mb = document.getElementById("txmore"); if (mb) mb.onclick = function () { txState.n += 200; upd(); };
      }
      ["fm", "fc"].forEach(function (id) { document.getElementById(id).onchange = function () { txState.n = 100; upd(); }; });
      document.getElementById("fq").oninput = function () { txState.n = 100; upd(); };
      upd();
    });
    return o;
  }

  // ───── 화면: 식단 (영양사) ─────
  function shopItems() {
    var sh = sheet("장보기"); if (!sh) return [];
    var out = [], key = N.file;
    var saved = store("shop_" + key) || {};
    sh.blocks.forEach(function (b, bi) {
      if (b.t !== "table") return;
      var ip = b.head.indexOf("품목");
      if (ip >= 0) b.rows.forEach(function (r) { if (r[ip]) out.push({ id: bi + ":" + r[ip], name: r[ip], qty: r[b.head.indexOf("수량")], price: r[b.head.indexOf("예상가(원)")], use: r[b.head.indexOf("쓰임")], when: r[0], done: !!saved[bi + ":" + r[ip]] }); });
    });
    return out;
  }
  function pantryItems(sh) { // '집에 있는지 확인' 목록: 칸 하나짜리 표
    var res = [];
    sh.blocks.forEach(function (b, bi) {
      if (b.t !== "table" || b.head.indexOf("품목") >= 0) return;
      [b.head].concat(b.rows).forEach(function (r) { var nm = r.filter(function (c) { return c != null; })[0]; if (nm) res.push({ id: "p" + bi + ":" + nm, name: nm }); });
    });
    return res;
  }
  function blocksHtml(bl) {
    var o = "", list = null;
    function close() { if (list) { o += '<ul class="steps">' + list.join("") + "</ul>"; list = null; } }
    bl.forEach(function (b) {
      if (b.t === "p" && /^[•·]/.test(b.x)) { (list = list || []).push("<li>" + esc(b.x.replace(/^[•·]\s*/, "").replace(/`/g, "")) + "</li>"); return; }
      close();
      if (b.t === "h") o += "<h2>" + esc(b.x) + "</h2>";
      else if (b.t === "p") o += (/^(필요한|11\/|합계|쿠팡|집에)/.test(b.x) ? '<p class="note">' + esc(b.x) + "</p>" : "<h3 style=\"margin-top:20px\">" + esc(b.x) + "</h3>");
      else if (b.t === "table") o += table(b.head, b.rows);
    });
    close();
    return o;
  }
  // 표가 없는 시트(조리·영양, 보류 등): '제목 (메타, 메타)' 줄 + • 목록을 섹션 카드로.
  //  제목에 기준·원칙·규칙 → 타일, 하지 않은·보류 → 보류 목록, 그 밖 → 번호 붙은 순서.
  function inl(s) { return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/ → /g, ' <span class="arr">→</span> '); }
  function splitHead(t) { // "김치콩나물국: 물 1L…" → ["김치콩나물국", "물 1L…"]
    var i = t.indexOf(": "); return i > 0 && i <= 64 && t.slice(0, i).indexOf(". ") < 0 ? [t.slice(0, i), t.slice(i + 2)] : [null, t];
  }
  function metaChip(x) {
    var icon = /\d/.test(x) && /분|시간/.test(x) ? ICON.clock : /\d+\/\d+/.test(x) ? ICON.cal : /끼/.test(x) ? ICON.meal : "";
    return '<span class="meta">' + icon + esc(x) + "</span>";
  }
  function sectionsHtml(bl) {
    var secs = [], cur = null, isB = function (b) { return b && b.t === "p" && /^[•·]/.test(b.x); };
    function open(title) { cur = { title: title, items: [], notes: [] }; secs.push(cur); }
    bl.forEach(function (b, i) {
      if (isB(b)) { if (!cur) open(""); cur.items.push(b.x.replace(/^[•·]\s*/, "")); return; }
      if (b.t === "h" || isB(bl[i + 1])) open(b.x);
      else { if (!cur) open(""); cur.notes.push(b.x); }
    });
    return '<div class="secs">' + secs.map(function (s) {
      var m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(s.title), name = m ? m[1] : s.title, chips = [], subs = [];
      (m ? m[2].split(/,\s*/) : []).forEach(function (x) { (x.length > 16 ? subs : chips).push(x); });
      var kind = /기준|원칙|규칙/.test(name) ? "tips" : /하지 않은|보류/.test(name) ? "hold" : "steps";
      var o = '<section class="sec sec-' + kind + '">';
      if (name) o += '<header class="sec-h"><div><h3>' + esc(name) + "</h3>" + (subs.length ? "<p>" + esc(subs.join(", ")) + "</p>" : "") + "</div>" +
        (chips.length ? '<div class="metas">' + chips.map(metaChip).join("") + "</div>" : "") + "</header>";
      if (kind === "steps") o += '<ol class="tl">' + s.items.map(function (t) {
        var p = splitHead(t); return "<li>" + (p[0] ? "<b>" + inl(p[0]) + "</b>" : "") + "<span>" + inl(p[1]) + "</span></li>";
      }).join("") + "</ol>";
      else if (kind === "tips") o += '<div class="tiles">' + s.items.map(function (t) {
        var p = splitHead(t); return '<div class="tile"><i>' + ICON.check + "</i><div>" + (p[0] ? "<b>" + inl(p[0]) + "</b>" : "") + "<span>" + inl(p[1]) + "</span></div></div>";
      }).join("") + "</div>";
      else o += '<div class="holds">' + s.items.map(function (t) {
        var p = splitHead(t), hm = p[0] && /^(.*?)\s*\((.*)\)$/.exec(p[0]);
        return '<div class="hld"><i>' + ICON.pause + "</i><div>" + (p[0] ? "<b>" + inl(hm ? hm[1] : p[0]) + "</b>" + (hm ? '<small>' + inl(hm[2]) + "</small>" : "") : "") +
          "<span>" + inl(p[1]) + "</span></div></div>";
      }).join("") + "</div>";
      if (s.notes.length) o += '<div class="sec-notes">' + s.notes.map(function (x) { return "<p>" + inl(x) + "</p>"; }).join("") + "</div>";
      return o + "</section>";
    }).join("") + "</div>";
  }
  function pageMeal(sub) {
    var names = N.sheets.map(function (s) { return s.name; }).concat(N.hall ? ["학식"] : []);
    sub = names.indexOf(sub) >= 0 ? sub : names[0];
    var o = '<span class="who nut">영양사 에이전트</span><h1>식단·장보기</h1><p class="sub">' + esc(N.period) + "</p>";
    o += '<div class="chips">' + names.map(function (t) { return '<button data-go="#meal/' + t + '" class="' + (t === sub ? "on" : "") + '">' + esc(t) + "</button>"; }).join("") + "</div>";
    if (sub === "식단표" && mealT) {
      var sh = sheet("식단표");
      o += "<h2>" + esc(sh.blocks[0].x) + '</h2><div class="days">' + mealT.rows.filter(function (r) { return rowDate(r[0]); }).map(function (r) { return dayCard(r, mealT.head); }).join("") + "</div>";
      var tot = mealT.rows.filter(function (r) { return r.indexOf("합계") >= 0; })[0];
      sh.blocks.slice(1).forEach(function (b) { if (b.t === "p") o += '<p class="note">' + esc(b.x) + "</p>"; });
    } else if (sub === "장보기") {
      var sh2 = sheet("장보기"), items = shopItems(), pantry = pantryItems(sh2), saved = store("shop_" + N.file) || {};
      var total = items.reduce(function (a, s) { return a + (typeof s.price === "number" ? s.price : 0); }, 0);
      o += "<h2>" + esc(sh2.blocks[0].x) + '</h2><p class="sub">체크해 두면 이 기기에 남습니다. 예상 합계 <b>' + won(total) + "</b></p>";
      o += '<div class="check">' + items.map(function (s) {
        return '<label class="' + (s.done ? "done" : "") + '"><input type="checkbox" data-id="' + esc(s.id) + '"' + (s.done ? " checked" : "") + '><span><span class="t">' + esc(s.name) + " · " + esc(s.qty || "") + '</span><br><span class="q">' + esc(s.use || "") + '</span></span><span class="p">' + won(s.price) + "</span></label>";
      }).join("") + "</div>";
      if (pantry.length) {
        o += '<h3 style="margin-top:20px">집에 있는지 확인하고 없는 것만 사기</h3><div class="check">' + pantry.map(function (s) {
          return '<label class="' + (saved[s.id] ? "done" : "") + '"><input type="checkbox" data-id="' + esc(s.id) + '"' + (saved[s.id] ? " checked" : "") + '><span class="t">' + esc(s.name) + "</span></label>";
        }).join("") + "</div>";
      }
      sh2.blocks.forEach(function (b) { if (b.t === "p" && !/^집에 있는지 확인하고/.test(b.x)) o += '<p class="note">' + esc(b.x) + "</p>"; });
      later(function () {
        app.querySelectorAll(".check input").forEach(function (cb) {
          cb.onchange = function () { var sv = store("shop_" + N.file) || {}; sv[cb.dataset.id] = cb.checked; store("shop_" + N.file, sv); cb.closest("label").classList.toggle("done", cb.checked); };
        });
      });
    } else if (sub === "학식") {
      var hl = N.hall;
      o += '<p class="sub">학식조회.py가 ' + esc(hl.fetched) + "에 받아 온 것. 의대 본관·애기능·학생회관만 씁니다(천원의 아침 1,000원 줄 포함).</p>";
      if (hl.medImg) o += '<h2>의대 본관 식당 (' + esc(hl.medImg.name.replace("의대본관_", "")) + ')</h2><img class="menu" alt="의대 본관 주간 식단표" src="' + hl.medImg.src + '">';
      hl.halls.forEach(function (x) {
        o += "<h2>" + esc(x.name) + ' <span class="muted" style="font-size:13px;font-weight:400">' + esc(x.which === "this" ? "이번 주" : "다음 주") + " " + esc(x.week) + '</span></h2><div class="grid g3">' +
          x.days.map(function (d) {
            var dd = /(\d{4})\.(\d\d)\.(\d\d)/.exec(d.date), isT = dd && +dd[2] === TODAY.getMonth() + 1 && +dd[3] === TODAY.getDate();
            return '<div class="card hall-day' + '"' + (isT ? ' style="border-color:var(--nut)"' : "") + "><h3>" + esc(d.date) + (isT ? ' <span class="badge">오늘</span>' : "") + "</h3>" +
              d.meals.map(function (m) { return "<p><span>" + esc(m[0]) + "</span>" + esc(m[1]) + "</p>"; }).join("") + "</div>";
          }).join("") + "</div>";
      });
      if (!hl.halls.length) o += '<p class="muted">받아 온 학교 식단이 없습니다.</p>';
    } else {
      var bl = sheet(sub).blocks;
      o += bl.some(function (b) { return b.t === "table"; }) ? blocksHtml(bl) : sectionsHtml(bl);
    }
    if (sub === "식단표" && N.todo.length) o += '<h2>영양사 에이전트 메모</h2><div class="card"><ul class="plain">' + N.todo.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>";
    return o;
  }

  // ───── 화면: 투자 (Stock Portfolio 앱) ─────
  // 한국 주식 관례: 오르면 빨강(.up), 내리면 파랑(.down) — 이 탭 안에서만 쓴다.
  var P = D.pf;
  var CSYM = { USD: "$", JPY: "¥", CNY: "CN¥", TWD: "NT$", EUR: "€", GBP: "£" };
  var CNAME = { KRW: "원", USD: "미국 달러", JPY: "일본 엔", CNY: "중국 위안", TWD: "대만 달러", EUR: "유로", GBP: "영국 파운드" };
  function money(v, c) {
    if (v == null) return "–";
    if (!c || c === "KRW") return won(v);
    var d = c === "JPY" ? 0 : 2;
    return (v < 0 ? "-" : "") + (CSYM[c] || c + " ") + Math.abs(v).toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function ud(v) { return v > 0 ? "up" : v < 0 ? "down" : ""; }
  function signed(v, c) { return v == null ? "–" : '<span class="' + ud(v) + '">' + (v > 0 ? "+" : "") + money(v, c) + "</span>"; }
  function pct(v) { return v == null ? "" : '<span class="' + ud(v) + '">' + (v > 0 ? "+" : "") + (Math.round(v * 100) / 100).toFixed(2) + "%</span>"; }
  function dstr(ts, time) {
    var d = new Date(ts * 1000), s = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    return time ? s + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) : s;
  }
  function spark(vals, prev) {
    var v = (vals || []).filter(function (x) { return x != null; }); if (v.length < 2) return "";
    var mn = Math.min.apply(null, v.concat(prev || v[0])), mx = Math.max.apply(null, v.concat(prev || v[0])), r = mx - mn || 1, W = 120, H = 34;
    var pts = v.map(function (x, i) { return (i * W / (v.length - 1)).toFixed(1) + "," + (H - 2 - (x - mn) / r * (H - 4)).toFixed(1); }).join(" ");
    var base = prev ? '<line x1="0" x2="' + W + '" y1="' + (H - 2 - (prev - mn) / r * (H - 4)).toFixed(1) + '" y2="' + (H - 2 - (prev - mn) / r * (H - 4)).toFixed(1) + '" stroke="var(--axis)" stroke-dasharray="2 3"/>' : "";
    var c = prev && v[v.length - 1] < prev ? "var(--down)" : "var(--up)";
    return '<svg class="spark" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' + base + '<polyline points="' + pts + '" fill="none" stroke="' + c + '" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
  }

  // 여러 선 그래프 (빈 값은 끊어 그림). series: [{name, color, vals, dash, area}]
  function multiLine(id, labels, series, fy, ftip, base) {
    var W = chartW(), H = 250, L = 52, R = 10, T = 12, B = 28;
    var all = []; series.forEach(function (s) { s.vals.forEach(function (v) { if (v != null && isFinite(v)) all.push(v); }); });
    if (base != null) all.push(base);
    var mn = Math.min.apply(null, all), mx = Math.max.apply(null, all), pad = (mx - mn) * 0.1 || Math.abs(mx) * 0.05 || 1;
    var step = nice(mx - mn + 2 * pad), lo = Math.floor((mn - pad) / step) * step, hi = Math.ceil((mx + pad) / step) * step;
    var n = labels.length, x = function (i) { return L + (W - L - R) * (n > 1 ? i / (n - 1) : 0.5); };
    var y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    var g = '<g class="grid">';
    for (var v = lo; v <= hi + step / 2; v += step) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fy(v) + "</text>";
    g += "</g>";
    var xl = "", every = Math.max(1, Math.ceil(n / ((W - L) / 64)));
    labels.forEach(function (l, i) { if (i % every === 0) xl += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + "</text>"; });
    var lines = "";
    series.forEach(function (s) {
      var segs = [], cur = [];
      s.vals.forEach(function (v, i) { if (v == null || !isFinite(v)) { if (cur.length) segs.push(cur); cur = []; } else cur.push([x(i), y(v)]); });
      if (cur.length) segs.push(cur);
      segs.forEach(function (sg) {
        var d = sg.map(function (p, k) { return (k ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1); }).join("");
        if (s.area && sg.length > 1) lines += '<path d="' + d + "L" + sg[sg.length - 1][0].toFixed(1) + "," + (H - B) + "L" + sg[0][0].toFixed(1) + "," + (H - B) + 'Z" fill="' + s.color + '" opacity=".08"/>';
        lines += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="' + (s.width || 2) + '" stroke-linejoin="round"' + (s.dash ? ' stroke-dasharray="5 4"' : "") + "/>";
      });
    });
    var bl = base != null ? '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(base) + '" y2="' + y(base) + '" stroke="var(--muted)" stroke-width="1" stroke-dasharray="2 3"/>' : "";
    later(function () {
      var wrap = document.getElementById(id); if (!wrap) return;
      var svg = wrap.querySelector("svg"), cross = svg.querySelector(".cross");
      svg.addEventListener("mousemove", function (e) {
        var b = svg.getBoundingClientRect(), px = (e.clientX - b.left) * W / b.width;
        var i = Math.max(0, Math.min(n - 1, Math.round((px - L) / (W - L - R) * (n - 1))));
        cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.style.display = "";
        var v0 = series[0].vals[i];
        tipShow(wrap, x(i) * b.width / W, (v0 != null ? y(v0) : T + 30) * b.height / H, "<b>" + esc(labels[i]) + "</b>" + series.map(function (s) {
          return '<div class="row"><span><i style="background:' + s.color + '"></i>' + esc(s.name) + "</span><span>" + ftip(s.vals[i]) + "</span></div>";
        }).join(""));
      });
      svg.addEventListener("mouseleave", function () { tipHide(); cross.style.display = "none"; });
    });
    return '<div class="legend">' + series.map(function (s) { return '<span><i class="' + (s.dash ? "dash" : "line") + '" style="background:' + s.color + (s.dash ? ";border-color:" + s.color : "") + '"></i>' + esc(s.name) + "</span>"; }).join("") + "</div>" +
      '<div class="chart" id="' + id + '"><svg viewBox="0 0 ' + W + " " + H + '">' + g + xl + bl + lines + '<line class="cross" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--axis)" style="display:none"/></svg></div>';
  }

  var PF_TABS = ["요약", "거래 기록", "환율"];
  var pfMode = "value";
  function pagePf(sub) {
    sub = PF_TABS.indexOf(sub) >= 0 ? sub : "요약";
    var o = '<span class="who inv">Stock Portfolio</span><h1>투자</h1>';
    if (!P) return o + '<div class="card"><p style="margin:0">투자 자료가 없습니다. Stock Portfolio 앱 폴더를 확인하고 build_data.py를 다시 돌리면 나옵니다.</p></div>';
    var S = P.summary, C = P.currency;
    o += '<p class="sub">' + dstr(P.asof, true) + " 기준 · 지연 시세(Yahoo Finance) · 앱 기록을 읽기만 합니다.</p>";
    o += '<div class="chips">' + PF_TABS.map(function (t) { return '<button data-go="#pf/' + t + '" class="' + (t === sub ? "on" : "") + '">' + t + "</button>"; }).join("") + "</div>";
    if (sub === "요약") {
      o += '<div class="pf-hero card"><div><span class="lbl">총 평가액</span><b class="big">' + money(S.total, C) + "</b>" +
        '<span class="chg">투자 손익 ' + signed(S.invPnl, C) + " " + pct(S.retPct) + "</span></div>" +
        '<dl class="pf-split"><div><dt>보유 주식</dt><dd>' + money(S.holdings, C) + "</dd></div><div><dt>현금</dt><dd>" + money(S.cash, C) + "</dd></div><div><dt>순입금</dt><dd>" + money(S.net, C) + "</dd></div></dl></div>";
      o += '<div class="grid g4" style="margin-top:12px">' +
        '<div class="card kpi"><span>평가 손익 (보유 중)</span><b>' + signed(S.pnl, C) + "</b><small>" + pct(S.pnlPct) + (S.priceEff != null ? " · 주가 " + signed(S.priceEff, C) + " · 환율 " + signed(S.fxEff, C) : "") + "</small></div>" +
        '<div class="card kpi"><span>실현 손익 (판 것)</span><b>' + signed(S.realized, C) + "</b><small>정리한 종목 " + P.closed.length + "개</small></div>" +
        '<div class="card kpi"><span>보유 원가</span><b>' + money(S.cost, C) + "</b><small>가중평균, 수수료 포함</small></div>" +
        '<div class="card kpi"><span>넣은 돈</span><b>' + money(S.deposits, C) + "</b><small>" + (S.withdrawals ? "뺀 돈 " + money(S.withdrawals, C) : "뺀 돈 없음") + "</small></div></div>";
      if (!S.complete || (S.issues && S.issues.length)) o += '<p class="warn" style="margin-top:12px">' + (S.complete ? "" : "일부 값이 빠져 합계가 완전하지 않습니다. ") + S.issues.map(esc).join(" ") + "</p>";

      var H = P.hist;
      if (H && H.ts.length > 1) {
        var lab = H.ts.map(function (t) { var d = new Date(t * 1000); return md(d); });
        o += '<h2>날짜별 가치</h2><div class="card"><div class="chips seg">' +
          '<button data-pf-mode="value" class="' + (pfMode === "value" ? "on" : "") + '">평가액</button><button data-pf-mode="pct" class="' + (pfMode === "pct" ? "on" : "") + '">수익률</button></div>';
        if (pfMode === "value") o += multiLine("c-pf", lab, [
          { name: "총 평가액", color: css("--s1"), vals: H.total, area: true, width: 2.4 },
          { name: "현금", color: css("--muted"), vals: H.cash, dash: true, width: 1.5 }], man, function (v) { return money(v, C); });
        else o += multiLine("c-pf", lab, [{ name: "시간가중수익률", color: css("--s1"), vals: H.twr, area: false, width: 2.4 }],
          function (v) { var p = Math.round(v - 100); return (p > 0 ? "+" : "") + p + "%"; },
          function (v) { return v == null ? "–" : ((v - 100) > 0 ? "+" : "") + (v - 100).toFixed(2) + "%"; }, 100);
        o += '<p class="note">' + (pfMode === "value" ? "주식은 그날 주가 × 그날 환율로, 현금은 통화별로 바꿔 더했습니다." : "시간가중수익률: 입금·출금은 수익으로 치지 않습니다. 100이 시작점.") + "</p></div>";
        later(function () {
          app.querySelectorAll("[data-pf-mode]").forEach(function (b) { b.onclick = function () { pfMode = b.dataset.pfMode; var y = window.scrollY; route(); window.scrollTo(0, y); }; });
        });
      }

      o += "<h2>보유 종목 <span class=\"muted\" style=\"font-size:13px;font-weight:500\">" + P.holdings.length + "개</span></h2><div class=\"grid g3\">";
      o += P.holdings.map(function (h) {
        var chg = h.price != null && h.prev ? (h.price / h.prev - 1) * 100 : null;
        var w = S.total ? h.value / S.total * 100 : null;
        return '<article class="card hold"><header><div><b>' + esc(h.name) + '</b><span class="tk">' + esc(h.ticker) + " · " + esc(h.exchange) + "</span></div>" + spark(h.spark, h.prev) + "</header>" +
          '<div class="px"><b>' + money(h.price, h.ccy) + "</b> " + pct(chg) + (h.priceSrc === "cache" ? ' <small class="muted">저장된 값</small>' : "") + "</div>" +
          "<dl>" +
          "<div><dt>평가액</dt><dd>" + money(h.value, C) + (w != null ? ' <small class="muted">' + w.toFixed(0) + "%</small>" : "") + "</dd></div>" +
          "<div><dt>평가 손익</dt><dd>" + signed(h.pnl, C) + " " + pct(h.pnlPct) + "</dd></div>" +
          "<div><dt>수량 · 평단</dt><dd>" + num(h.qty) + "주 · " + money(h.avg, h.ccy) + "</dd></div>" +
          (h.priceEff != null ? "<div><dt>주가 몫 · 환율 몫</dt><dd>" + signed(h.priceEff, C) + " · " + signed(h.fxEff, C) + "</dd></div>" : "") +
          "</dl>" + (h.issues && h.issues.length ? '<p class="note">' + h.issues.map(esc).join(" ") + "</p>" : "") + "</article>";
      }).join("") + "</div>";

      o += '<div class="grid g2" style="margin-top:12px"><div class="card"><h3>현금</h3><ul class="plain">' +
        Object.keys(P.cash).map(function (c) { return "<li>" + esc(CNAME[c] || c) + ' <b class="num" style="float:right">' + money(P.cash[c], c) + "</b></li>"; }).join("") + "</ul></div>" +
        '<div class="card"><h3>정리한 종목 (실현 손익)</h3><ul class="plain">' + (P.closed.length ? P.closed.map(function (c) {
          return "<li>" + esc(c.name) + ' <span class="muted">' + esc(c.ticker) + '</span><b class="num" style="float:right">' + signed(c.realized, C) + "</b></li>";
        }).join("") : '<li class="muted">없음</li>') + "</ul></div></div>";
      o += '<ul class="plain note" style="margin-top:14px">' + ["평가액 = 최근 주가 × 수량 × 최근 환율, 원가는 산 날의 실제 환율로 계산합니다(앱과 같은 방식).", "세금·배당·분할은 들어가지 않습니다."].concat(P.notes || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
    } else if (sub === "거래 기록") {
      o += table(["날짜", "종류", "종목", "수량", "가격", "수수료", "금액", "환율", "메모"], P.tx.slice().reverse().map(function (t) {
        var trade = t.type === "BUY" || t.type === "SELL";
        var amt = trade ? t.qty * t.price : t.amount;
        return [dstr(t.ts, true), t.label, t.name || "", trade ? num(t.qty) : "", trade ? money(t.price, t.ccy) : "", t.fee ? money(t.fee, t.ccy) : "",
          (t.type === "SELL" || t.type === "INITIAL" || t.type === "DEPOSIT" ? "+" : "-") + money(amt, t.ccy).replace(/^-/, ""),
          t.cashCcy !== t.ccy ? "1 " + t.ccy + " = " + num(t.fxRate) + " " + t.cashCcy : "", t.note || ""];
      }), { fmt: { 3: String, 4: String, 5: String, 6: function (v) { return '<span class="' + (v[0] === "+" ? "up" : "down") + '">' + v + "</span>"; }, 7: String } });
      o += '<p class="note">거래를 더하거나 고치는 것은 Stock Portfolio 앱에서 합니다. 이 사이트는 기록을 읽기만 합니다.</p>';
    } else if (sub === "환율") {
      var cs = Object.keys(P.fx);
      var opts = function (sel) { return cs.map(function (c) { return "<option value=\"" + c + "\"" + (c === sel ? " selected" : "") + ">" + c + " · " + esc(CNAME[c] || c) + "</option>"; }).join(""); };
      o += '<div class="card conv"><h3>환율 계산기</h3><div class="conv-row"><input id="cv-a" type="text" inputmode="decimal" value="100" aria-label="금액">' +
        '<select id="cv-f" aria-label="바꿀 통화">' + opts("USD") + '</select><button class="iconbtn" id="cv-sw" title="서로 바꾸기" aria-label="서로 바꾸기">⇄</button><select id="cv-t" aria-label="받을 통화">' + opts("KRW") + "</select></div>" +
        '<div class="conv-out" id="cv-out"></div><p class="note">참고 환율입니다. 은행 수수료·스프레드는 들어가지 않습니다. (' + dstr(P.asof, true) + ")</p></div>";
      o += "<h2>원화 기준 환율</h2>" + table(["통화", "1단위 = 원"], cs.filter(function (c) { return c !== "KRW"; }).map(function (c) { return [c + " · " + (CNAME[c] || ""), P.fx[c]]; }),
        { fmt: { 1: function (v) { return (Math.round(v * 100) / 100).toLocaleString("ko-KR") + "원"; } } });
      later(function () {
        var a = document.getElementById("cv-a"), f = document.getElementById("cv-f"), t = document.getElementById("cv-t"), out = document.getElementById("cv-out");
        function upd() {
          var v = parseFloat(String(a.value).replace(/,/g, "")), r = P.fx[f.value] / P.fx[t.value];
          out.innerHTML = isFinite(v) ? "<b>" + money(v * r, t.value) + "</b><span>1 " + f.value + " = " + (r >= 100 ? (Math.round(r * 100) / 100).toLocaleString("ko-KR") : (+r.toPrecision(4)).toLocaleString("ko-KR", { maximumFractionDigits: 8 })) + " " + t.value + "</span>" : '<span class="muted">숫자를 넣어 주십시오.</span>';
        }
        a.oninput = f.onchange = t.onchange = upd;
        document.getElementById("cv-sw").onclick = function () { var x = f.value; f.value = t.value; t.value = x; upd(); };
        upd();
      });
    }
    return o;
  }

  // ───── 뼈대 ─────
  function ic(d) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + d + "</svg>"; }
  var ICON = {
    home: ic('<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h4.5v-6h4v6h4.5V9"/>'),
    fin: ic('<rect x="3" y="5.5" width="18" height="14" rx="3"/><path d="M3 10h18"/><path d="M15.5 15h2"/>'),
    tx: ic('<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" stroke-width="2.6"/>'),
    pf: ic('<path d="M3.5 19.5h17"/><path d="M5 15.5l4.5-5 3.5 3 6-7"/><path d="M15 6.5h4v4"/>'),
    meal: ic('<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z"/><path d="M9 4.5c-.8 1 .8 2-.1 3.5M13 4.5c-.8 1 .8 2-.1 3.5"/>'),
    cal: ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>'),
    clock: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    pause: ic('<path d="M9.5 6.5v11M14.5 6.5v11"/>'),
    sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>'),
    moon: ic('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>'),
    lock: ic('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>')
  };
  var NAV = [["#home", "홈", "home"], ["#fin", "가계", "fin"], ["#tx", "거래내역", "tx"], ["#pf", "투자", "pf"], ["#meal", "식단", "meal"]];
  function isDark() { return (document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark"; }
  function themeIcon() { var b = document.getElementById("theme"); b.innerHTML = isDark() ? ICON.sun : ICON.moon; b.title = isDark() ? "밝게 보기" : "어둡게 보기"; }
  function shell() {
    document.body.insertAdjacentHTML("afterbegin",
      '<header class="top"><div class="top-in"><span class="brand"><i></i>General Assistant</span>' +
      '<nav class="tabs" id="nav">' + NAV.map(function (n) { return '<a href="' + n[0] + '">' + ICON[n[2]] + "<span>" + n[1] + "</span></a>"; }).join("") + "</nav>" +
      '<div class="actions"><button class="iconbtn" id="theme" aria-label="밝게/어둡게"></button>' +
      (window.SEC_LOGOUT ? '<button class="iconbtn" id="lockbtn" title="잠그기">' + ICON.lock + '<span class="lbl">잠그기</span></button>' : "") +
      "</div></div></header>");
    var th = store("theme"); if (th) document.documentElement.setAttribute("data-theme", th);
    themeIcon();
    document.getElementById("theme").onclick = function () {
      var nx = isDark() ? "light" : "dark"; document.documentElement.setAttribute("data-theme", nx); store("theme", nx); themeIcon(); route();
    };
    var lb = document.getElementById("lockbtn"); if (lb) lb.onclick = window.SEC_LOGOUT;
  }
  function route() {
    var hs = decodeURIComponent(location.hash || "#home").slice(1).split("/"), page = hs[0], sub = hs[1];
    queue = [];
    var html = page === "fin" ? pageFin(sub) : page === "tx" ? pageTx() : page === "pf" ? pagePf(sub) : page === "meal" ? pageMeal(sub) : pageHome();
    app.innerHTML = html + '<footer>자료 갱신 ' + esc(D.built) + "</footer>";
    document.querySelectorAll("#nav a").forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + (["fin", "tx", "pf", "meal"].indexOf(page) >= 0 ? page : "home")); });
    app.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { location.hash = b.dataset.go; }; });
    queue.forEach(function (fn) { fn(); });
    window.scrollTo(0, 0);
  }
  shell();
  window.addEventListener("hashchange", route);
  route();
})();
