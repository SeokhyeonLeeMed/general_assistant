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

  function chartW() { return Math.max(320, Math.min(720, (app.clientWidth || 640) - 34)); }
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
    var hello = TODAY.getFullYear() + "년 " + (TODAY.getMonth() + 1) + "월 " + TODAY.getDate() + "일 " + WD[TODAY.getDay()] + "요일";
    o += "<h1>" + hello + '</h1><p class="sub">회계사 에이전트와 영양사 에이전트가 정리한 내용입니다.</p>';

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
    o += '<div class="card kpi"><span>' + esc(bal[0]) + "</span><b>" + won(bal[1]) + "</b><small>" + esc(F.assetsTitle.replace(/^재무상태\s*/, "")) + " 기준</small></div>";
    if (net) o += '<div class="card kpi"><span>순자산</span><b>' + won(net[1]) + "</b><small>보증금 포함, 학자금대출 뺌</small></div>";
    o += '<div class="card kpi"><span>' + esc(lastM) + " 식비 (기록된 날까지)</span><b>" + won(food) + "</b><small>~" + esc(lastDate.slice(5).replace("-", "/")) + " · 목표 월 46만</small></div>";
    if (plan != null) o += '<div class="card kpi"><span>이번 식단 기간 식비 계획</span><b>' + won(plan) + "</b><small>목표 " + won(goal) + " 안</small></div>";
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
      o += '<p class="sub">학식조회.py가 ' + esc(hl.fetched) + "에 받아 온 것. 의대 본관·애기능·학생회관만 씁니다(천원의 아침은 뺐습니다).</p>";
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
      o += blocksHtml(sheet(sub).blocks);
    }
    if (sub === "식단표" && N.todo.length) o += '<h2>영양사 에이전트 메모</h2><div class="card"><ul class="plain">' + N.todo.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>";
    return o;
  }

  // ───── 뼈대 ─────
  var NAV = [["#home", "홈"], ["#fin", "가계"], ["#tx", "거래내역"], ["#meal", "식단"]];
  function shell() {
    document.body.insertAdjacentHTML("afterbegin",
      '<header class="top"><div class="top-in"><span class="brand"><i></i>내 비서</span>' +
      '<button class="iconbtn" id="theme" title="밝게/어둡게">화면</button>' + (window.SEC_LOGOUT ? '<button class="iconbtn" id="lockbtn">잠그기</button>' : "") +
      '</div><nav class="tabs" id="nav">' + NAV.map(function (n) { return '<a href="' + n[0] + '">' + n[1] + "</a>"; }).join("") + "</nav></header>");
    var th = store("theme"); if (th) document.documentElement.setAttribute("data-theme", th);
    document.getElementById("theme").onclick = function () {
      var cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var nx = cur === "dark" ? "light" : "dark"; document.documentElement.setAttribute("data-theme", nx); store("theme", nx); route();
    };
    var lb = document.getElementById("lockbtn"); if (lb) lb.onclick = window.SEC_LOGOUT;
  }
  function route() {
    var hs = decodeURIComponent(location.hash || "#home").slice(1).split("/"), page = hs[0], sub = hs[1];
    queue = [];
    var html = page === "fin" ? pageFin(sub) : page === "tx" ? pageTx() : page === "meal" ? pageMeal(sub) : pageHome();
    app.innerHTML = html + '<footer>자료 갱신 ' + esc(D.built) + "</footer>";
    document.querySelectorAll("#nav a").forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + (["fin", "tx", "meal"].indexOf(page) >= 0 ? page : "home")); });
    app.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { location.hash = b.dataset.go; }; });
    queue.forEach(function (fn) { fn(); });
    window.scrollTo(0, 0);
  }
  shell();
  window.addEventListener("hashchange", route);
  route();
})();
