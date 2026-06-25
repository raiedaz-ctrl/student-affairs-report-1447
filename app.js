const data = window.REPORT_DATA || {};
const slides = [...document.querySelectorAll("[data-slide]")];
const nav = document.getElementById("nav");
const stage = document.getElementById("stage");
const chapterName = document.getElementById("chapterName");
const sectionName = document.getElementById("sectionName");
const progress = document.getElementById("progress");
const currentSlide = document.getElementById("currentSlide");
const totalSlides = document.getElementById("totalSlides");
const colors = ["#0f5d30", "#1a7a41", "#2a9d57", "#5bb878", "#b8915a", "#7aa187", "#8a6a32", "#06351c", "#6f8f78", "#c3a46c", "#244b34", "#80b88d", "#9d7c4a", "#3d7250"];
const fmt = new Intl.NumberFormat("ar-SA");
const fmtDecimal = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 1 });
const events = data.events || [];
const categoryLabels = {
  "بطولة رياضية": "بطولات رياضية",
  "دورة تدريبية": "دورات تدريبية",
  "نتائج وإنجازات": "نتائج وإنجازات",
  "برنامج": "برامج",
  "مسابقة": "مسابقات",
  "فعالية": "فعاليات",
  "ورشة عمل": "ورش عمل",
  "معسكر": "معسكرات",
  "حفل تكريم": "حفلات تكريم",
  "ملتقى": "ملتقيات",
  "معرض": "معارض",
  "مبادرة": "مبادرات",
  "هاكاثون": "هاكاثونات",
  "تدريبات رياضية": "تدريبات رياضية",
};
let active = 0;
let chartsReady = false;
let modal;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function numberText(value) {
  const n = Number(value);
  return Number.isFinite(n) ? fmt.format(n) : escapeHtml(value);
}

function percent(value, total) {
  if (!total) return "0%";
  return `${fmtDecimal.format((value / total) * 100)}%`;
}

function categoryName(name) {
  return categoryLabels[name] || name || "-";
}

function displayValue(value) {
  return categoryName(value);
}

function encodeAssetPath(src) {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  return src.split("/").map((part, index) => index === 0 ? part : encodeURIComponent(part)).join("/");
}

function topMonth() {
  return [...(data.months || [])].sort((a, b) => b.count - a.count)[0] || { name: "-", count: 0 };
}

function setHero() {
  const heroBg = document.getElementById("heroBg");
  if (heroBg) heroBg.style.backgroundImage = "";
}

function buildNav() {
  totalSlides.textContent = slides.length;
  let lastChapter = "";
  nav.innerHTML = slides.map((slide, i) => {
    const chapter = slide.dataset.chapter || "التقرير";
    const chapterLabel = chapter !== lastChapter ? `<div class="nav-chapter">${escapeHtml(chapter)}</div>` : "";
    lastChapter = chapter;
    return `${chapterLabel}
      <button type="button" data-go="${i}">
        <span>${escapeHtml(slide.dataset.section)}</span>
        <span class="num">${i + 1}</span>
      </button>`;
  }).join("");
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-go]");
    if (button) {
      go(Number(button.dataset.go));
      if (window.matchMedia("(max-width: 980px)").matches) {
        document.getElementById("rail").dataset.open = "0";
      }
    }
  });
}

function buildKpis() {
  const topCategory = data.categories?.[0] || { name: "-", count: 0 };
  const topTarget = data.targets?.[0] || { name: "-", count: 0 };
  const month = topMonth();
  const total = data.totals?.displayedRecords || 0;
  const kpis = [
    [`أعلى مجال: ${categoryName(topCategory.name)}`, topCategory.count, `${percent(topCategory.count, total)} من إجمالي البرامج والأنشطة.`],
    [`الفئة الأكثر استهدافًا: ${topTarget.name}`, topTarget.count, `${percent(topTarget.count, total)} من إجمالي البرامج والأنشطة.`],
    [`أعلى شهر: ${month.shortName || month.name}`, month.count, "ذروة النشاط الظاهرة في التوزيع الزمني للتقرير."],
    ["الفئات المستهدفة", data.totals?.targets || 0, "عدد الفئات التي شملتها البرامج والأنشطة."],
  ];
  document.getElementById("kpiGrid").innerHTML = kpis.map(([label, value, note]) => {
    const isNumber = Number.isInteger(value);
    return `<article class="kpi"><span>${escapeHtml(label)}</span><b ${isNumber ? `data-count="${value}"` : ""}>${isNumber ? "0" : escapeHtml(value)}</b><p>${escapeHtml(note)}</p></article>`;
  }).join("");
  document.getElementById("executiveInsight").textContent =
    `يعرض التقرير ${fmt.format(total)} برنامجًا ونشاطًا خلال عام 1447هـ. توزعت الأنشطة على ${fmt.format(data.totals?.categories || 0)} مجالًا، وشملت ${fmt.format(data.totals?.targets || 0)} فئات مستهدفة. أعلى مجال كان ${categoryName(topCategory.name)} بعدد ${fmt.format(topCategory.count)}، ثم ${categoryName(data.categories?.[1]?.name)} بعدد ${fmt.format(data.categories?.[1]?.count || 0)}. الفئة الأكثر استهدافًا هي ${topTarget.name} بعدد ${fmt.format(topTarget.count)}، وأعلى شهر نشاطًا هو ${month.name} بعدد ${fmt.format(month.count)}.`;
}

function buildNumberReading() {
  const total = data.totals?.displayedRecords || 0;
  const topCategory = data.categories?.[0] || { name: "-", count: 0 };
  const secondCategory = data.categories?.[1] || { name: "-", count: 0 };
  const thirdCategory = data.categories?.[2] || { name: "-", count: 0 };
  const fourthCategory = data.categories?.[3] || { name: "-", count: 0 };
  const topTarget = data.targets?.[0] || { name: "-", count: 0 };
  const month = topMonth();
  const cards = [
    { title: "أكثر مسارين حضورًا", value: `${categoryName(topCategory.name)} و${categoryName(secondCategory.name)}`, number: "", text: `يتصدران المشهد بعدد ${numberText(topCategory.count)} و${numberText(secondCategory.count)}.` },
    { title: "مسارات تالية", value: `${categoryName(thirdCategory.name)} ثم ${categoryName(fourthCategory.name)}`, number: "", text: `حضورهما يأتي بعد المسارين الأعلى بعدد ${numberText(thirdCategory.count)} و${numberText(fourthCategory.count)}.` },
    { title: "الفئة الأبرز", value: topTarget.name, number: topTarget.count, text: "الفئة التي ظهر لها النصيب الأكبر من البرامج والأنشطة." },
    { title: "ذروة النشاط", value: month.name, number: month.count, text: "الشهر الأعلى في كثافة البرامج والأنشطة." },
    { title: "الفترة الزمنية", value: `${data.totals?.dateStart || "-"} إلى ${data.totals?.dateEnd || "-"}`, number: "", text: "النطاق الذي يغطيه التقرير." },
  ];
  document.getElementById("readingGrid").innerHTML = cards.map((card) => `
    <article class="reading-card">
      <span>${escapeHtml(card.title)}</span>
      <b>${numberText(displayValue(card.value))}</b>
      <small>${Number.isFinite(Number(card.number)) ? numberText(card.number) : ""}</small>
      <p>${escapeHtml(card.text)}</p>
    </article>
  `).join("");
  document.getElementById("numberNarrative").innerHTML = `
    <p>توضح الأرقام أن العمادة قدمت حراكًا واسعًا ومتنوعًا، لا يقتصر على نوع واحد من البرامج، بل يمتد بين المسارات الرياضية، التدريبية، الثقافية، التطوعية، والفعاليات العامة.</p>
    <p>الثقل الأكبر يظهر في <b>${escapeHtml(categoryName(topCategory.name))}</b> بعدد ${numberText(topCategory.count)}، ويليه <b>${escapeHtml(categoryName(secondCategory.name))}</b> بعدد ${numberText(secondCategory.count)}، ثم <b>${escapeHtml(categoryName(thirdCategory.name))}</b> بعدد ${numberText(thirdCategory.count)}، ثم <b>${escapeHtml(categoryName(fourthCategory.name))}</b> بعدد ${numberText(fourthCategory.count)}.</p>
    <p>الفئة المستهدفة الأوسع هي <b>${escapeHtml(topTarget.name)}</b> بعدد ${numberText(topTarget.count)}، وأعلى شهر نشاطًا هو <b>${escapeHtml(month.name)}</b> بعدد ${numberText(month.count)}.</p>
  `;
  document.getElementById("sourceRule").textContent = data.presentationNote || "تعرض المؤشرات صورة موجزة عن برامج وأنشطة العمادة خلال عام 1447هـ.";
  document.getElementById("sourceChecks").innerHTML = [
    ["فترة التقرير", "العام 1447هـ"],
    ["نطاق التاريخ", `${data.totals?.dateStart || "-"} إلى ${data.totals?.dateEnd || "-"}`],
    ["المجالات", data.totals?.categories || 0],
    ["التكرار المستبعد", data.totals?.duplicatesExcluded || 0],
  ].map(([label, value]) => `<div><span>${escapeHtml(label)}</span><b>${numberText(value)}</b></div>`).join("");
}

function buildBars() {
  const categories = data.categories || [];
  const max = Math.max(...categories.map((item) => item.count), 1);
  const top = categories[0] || { name: "-", count: 0 };
  const total = data.totals?.displayedRecords || 0;
  document.getElementById("categoryBars").innerHTML = `
    <div class="panel-title">
      <span>قراءة المجالات</span>
      <b>${fmt.format(categories.length)} مجالًا</b>
    </div>
    <div class="focus-card">
      <span>الأعلى حضورًا</span>
      <b>${escapeHtml(categoryName(top.name))}</b>
      <p>${fmt.format(top.count)} برنامجًا ونشاطًا، بنسبة ${percent(top.count, total)} من إجمالي التقرير.</p>
    </div>
    <div class="summary-list">
      ${categories.map((item, i) => `
        <div class="bar-row">
          <div class="bar-line"><span>${escapeHtml(categoryName(item.name))}</span><b>${fmt.format(item.count)}</b></div>
          <div class="bar-track"><div class="bar-fill" data-width="${(item.count / max) * 100}%" style="background:${colors[i % colors.length]}"></div></div>
        </div>
      `).join("")}
    </div>
  `;
}

function buildTargetBars() {
  const targets = data.targets || [];
  const max = Math.max(...targets.map((item) => item.count), 1);
  const top = targets[0] || { name: "-", count: 0 };
  const total = data.totals?.displayedRecords || 0;
  document.getElementById("targetBars").innerHTML = `
    <div class="panel-title">
      <span>قراءة الفئة المستهدفة</span>
      <b>${fmt.format(targets.length)} فئات</b>
    </div>
    <div class="focus-card">
      <span>النطاق الأوسع</span>
      <b>${escapeHtml(top.name)}</b>
      <p>${fmt.format(top.count)} برنامجًا ونشاطًا موجّهًا لهذه الفئة، بنسبة ${percent(top.count, total)} من إجمالي التقرير.</p>
    </div>
    <div class="summary-list">
      ${targets.map((item, i) => `
        <div class="bar-row">
          <div class="bar-line"><span>${escapeHtml(item.name)}</span><b>${fmt.format(item.count)}</b></div>
          <div class="bar-track"><div class="bar-fill" data-width="${(item.count / max) * 100}%" style="background:${colors[(i + 3) % colors.length]}"></div></div>
        </div>
      `).join("")}
    </div>
  `;
}

function buildMonths() {
  const months = data.months || [];
  const sorted = [...months].sort((a, b) => b.count - a.count);
  const max = Math.max(...months.map((item) => item.count), 1);
  document.getElementById("monthTimeline").innerHTML = months.map((item, i) => `
    <div class="month-row">
      <span>${escapeHtml(item.name)}</span>
      <div class="month-track"><div class="month-fill" data-width="${(item.count / max) * 100}%" style="background:${colors[i % colors.length]}"></div></div>
      <b>${fmt.format(item.count)}</b>
    </div>
  `).join("");
  document.getElementById("monthHighlights").innerHTML = sorted.slice(0, 3).map((item, i) => `
    <div class="mini-card"><span>${i === 0 ? "أعلى شهر نشاطًا" : "شهر بارز"}</span><b>${fmt.format(item.count)}</b><span>${escapeHtml(item.name)}</span></div>
  `).join("");
}

function buildTableTools() {
  const categorySelect = document.getElementById("categoryFilter");
  const targetSelect = document.getElementById("targetFilter");
  categorySelect.innerHTML = `<option value="">كل المجالات</option>` + (data.categories || [])
    .map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(categoryName(item.name))}</option>`).join("");
  targetSelect.innerHTML = `<option value="">كل الفئات</option>` + (data.targets || [])
    .map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
  ["searchInput", "categoryFilter", "targetFilter"].forEach((id) => {
    document.getElementById(id).addEventListener(id === "searchInput" ? "input" : "change", renderTable);
  });
  renderTable();
}

function filteredEvents() {
  const term = document.getElementById("searchInput").value.trim().toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const target = document.getElementById("targetFilter").value;
  return events.filter((event) => {
    const text = `${event.name} ${event.category} ${event.targetAudience} ${event.details}`.toLowerCase();
    return (!category || event.category === category) &&
      (!target || event.targetAudience === target) &&
      (!term || text.includes(term));
  });
}

function renderTable() {
  const rows = filteredEvents();
  document.getElementById("tableSummary").innerHTML = `
    <span>المعروض الآن: <b>${fmt.format(rows.length)}</b></span>
  `;
  document.getElementById("eventsBody").innerHTML = rows.map((event) => `
    <tr data-event-id="${escapeHtml(event.id)}">
      <td>${escapeHtml(event.date)}<small>${escapeHtml(event.monthName || "")}</small></td>
      <td><b>${escapeHtml(event.name)}</b><small>${escapeHtml(event.details)}</small></td>
      <td><span class="tag">${escapeHtml(categoryName(event.category))}</span></td>
      <td><span class="tag tag-soft">${escapeHtml(event.targetAudience || "غير محدد")}</span></td>
      <td>${event.tweetUrl ? `<a class="tweet-link" href="${escapeHtml(event.tweetUrl)}" target="_blank" rel="noopener">فتح الرابط</a>` : "-"}</td>
    </tr>
  `).join("");
}

function makeCharts() {
  if (chartsReady) return;
  if (!window.Chart) {
    document.querySelectorAll(".chart-panel").forEach((panel) => {
      panel.innerHTML = `<div class="chart-fallback">تعذر تحميل مكتبة الرسوم البيانية. بقية التقرير يعمل بشكل طبيعي.</div>`;
    });
    return;
  }
  chartsReady = true;
  if (window.ChartDataLabels) Chart.register(window.ChartDataLabels);
  Chart.defaults.font.family = '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif';
  Chart.defaults.color = "#46584c";
  Chart.defaults.borderColor = "#e6ece6";
  Chart.defaults.plugins.legend.rtl = true;
  Chart.defaults.plugins.legend.textDirection = "rtl";

  new Chart(document.getElementById("categoryChart"), {
    type: "bar",
    data: {
      labels: (data.categories || []).map((item) => categoryName(item.name)),
      datasets: [{ label: "عدد البرامج والأنشطة", data: (data.categories || []).map((item) => item.count), backgroundColor: colors }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: { anchor: "end", align: "left", color: "#0f5d30", font: { weight: "700" } } },
      scales: { x: { beginAtZero: true }, y: { ticks: { font: { weight: "700" } } } }
    }
  });

  new Chart(document.getElementById("targetChart"), {
    type: "doughnut",
    data: {
      labels: (data.targets || []).map((item) => item.name),
      datasets: [{ data: (data.targets || []).map((item) => item.count), backgroundColor: colors, borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "58%",
      plugins: {
        legend: { position: "bottom" },
        datalabels: { color: "#fff", font: { weight: "800" }, formatter: (v) => v >= 4 ? v : "" }
      }
    }
  });
}

function buildClosingReading() {
  const topCategory = data.categories?.[0] || { name: "-", count: 0 };
  const secondCategory = data.categories?.[1] || { name: "-", count: 0 };
  document.getElementById("closingReading").textContent =
    `يعرض هذا التقرير صورة مختصرة عن برامج وأنشطة عمادة شؤون الطلاب خلال عام 1447هـ. توضح الأرقام حجم ما تم تنفيذه، وتبين أكثر المجالات حضورًا، والفئات المستهدفة، وتوزيع البرامج والأنشطة خلال أشهر العام. ومن خلال المؤشرات والرسوم وقائمة البرامج، يستطيع القارئ تكوين فكرة واضحة وسريعة عن طبيعة الأنشطة وما برز منها خلال العام.`;
}

function animateNumbers(scope) {
  scope.querySelectorAll("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    const started = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - started) / 850);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt.format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  scope.querySelectorAll("[data-width]").forEach((el) => {
    el.style.width = "0";
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.width = el.dataset.width; }));
  });
}

function go(index) {
  active = Math.max(0, Math.min(slides.length - 1, index));
  slides.forEach((slide, i) => slide.classList.toggle("active", i === active));
  [...nav.querySelectorAll("button")].forEach((button, i) => button.classList.toggle("active", i === active));
  currentSlide.textContent = active + 1;
  chapterName.textContent = slides[active].dataset.chapter || "";
  sectionName.textContent = slides[active].dataset.section;
  progress.style.width = `${((active + 1) / slides.length) * 100}%`;
  stage.scrollTop = 0;
  animateNumbers(slides[active]);
  if (active >= 3) makeCharts();
}

function openEventModal(eventId) {
  const event = events.find((item) => item.id === eventId);
  if (!event || !modal) return;
  modal.querySelector(".modal-card").innerHTML = `
    <button aria-label="إغلاق" data-close>×</button>
    <h3>${escapeHtml(event.name)}</h3>
    <p>${escapeHtml(event.details)}</p>
    <div class="modal-meta">
      <span>${escapeHtml(event.date)}</span>
      <span>${escapeHtml(categoryName(event.category))}</span>
      <span>${escapeHtml(event.targetAudience)}</span>
    </div>
    ${event.tweetUrl ? `<a class="tweet-link modal-link" href="${escapeHtml(event.tweetUrl)}" target="_blank" rel="noopener">فتح رابط التوثيق</a>` : ""}
  `;
  modal.style.display = "flex";
}

function setupModal() {
  modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `<div class="modal-card"></div>`;
  document.body.appendChild(modal);
  const close = () => { modal.style.display = "none"; };
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-close]")) close();
  });
  document.addEventListener("click", (event) => {
    const row = event.target.closest("[data-event-id]");
    if (row && !event.target.closest("a")) openEventModal(row.dataset.eventId);
  });
}

function setupControls() {
  document.getElementById("prevBtn").addEventListener("click", () => go(active - 1));
  document.getElementById("nextBtn").addEventListener("click", () => go(active + 1));
  document.getElementById("startBtn").addEventListener("click", () => go(1));
  const rail = document.getElementById("rail");
  if (window.matchMedia("(max-width: 980px)").matches) {
    rail.dataset.open = "0";
  }
  document.getElementById("railToggle").addEventListener("click", () => {
    const open = rail.dataset.open !== "0";
    rail.dataset.open = open ? "0" : "1";
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "PageDown") go(active + 1);
    if (event.key === "ArrowRight" || event.key === "PageUp") go(active - 1);
    if (event.key === "Escape" && modal) modal.style.display = "none";
  });
}

setHero();
buildNav();
buildKpis();
buildNumberReading();
buildBars();
buildTargetBars();
buildMonths();
buildTableTools();
buildClosingReading();
setupModal();
setupControls();
go(0);
