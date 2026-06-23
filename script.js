const speakerList = document.querySelector("#speakerList");
const searchInput = document.querySelector("#speakerSearch");
const resultCount = document.querySelector("#resultCount");
const yearFilter = document.querySelector("#yearFilter");
const pageSizeSelect = document.querySelector("#pageSize");
const prevPageButton = document.querySelector("#prevPage");
const nextPageButton = document.querySelector("#nextPage");
const pageInfo = document.querySelector("#pageInfo");
const tableRows = [...document.querySelectorAll(".speaker-table tbody tr[data-report-id]")];
let currentPage = 1;

const reportGroupLabels = {
  0: "Upcoming",
  1: "Previous",
  2: "Unscheduled"
};

function parseReportDate(value) {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function dateRank(value) {
  const date = parseReportDate(value);
  return date ? date.getTime() : Number.NEGATIVE_INFINITY;
}

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function reportGroup(entry) {
  const status = (entry.dataset.status || "").toLowerCase();
  if (["upcoming", "ongoing", "planned"].includes(status)) return 0;
  if (["recent", "completed", "previous", "past"].includes(status)) return 1;

  const stamp = dateRank(entry.dataset.date);
  if (stamp === Number.NEGATIVE_INFINITY) return 2;
  return stamp >= todayStart() ? 0 : 1;
}

function compareEntries(a, b) {
  const groupDiff = reportGroup(a) - reportGroup(b);
  if (groupDiff !== 0) return groupDiff;

  const group = reportGroup(a);
  const aDate = dateRank(a.dataset.date);
  const bDate = dateRank(b.dataset.date);
  const dateDiff = group === 0 ? aDate - bDate : bDate - aDate;
  if (dateDiff !== 0) return dateDiff;

  return (a.dataset.reportId || "").localeCompare(b.dataset.reportId || "");
}

function createTableGroupRow(group) {
  const row = document.createElement("tr");
  row.className = "report-group-row";
  row.dataset.reportGroup = String(group);

  const cell = document.createElement("td");
  cell.colSpan = 5;
  cell.innerHTML = `<span>${reportGroupLabels[group]}</span>`;
  row.appendChild(cell);

  return row;
}

function createCardGroupHeading(group) {
  const heading = document.createElement("div");
  heading.className = "report-group-heading";
  heading.dataset.reportGroup = String(group);
  heading.innerHTML = `<span>${reportGroupLabels[group]}</span>`;
  return heading;
}

function insertGroupSeparators(container, entries, createSeparator) {
  container.querySelectorAll(".report-group-row, .report-group-heading").forEach((node) => node.remove());

  let lastGroup = null;
  entries.forEach((entry) => {
    const group = reportGroup(entry);
    if (group !== lastGroup) {
      container.appendChild(createSeparator(group));
      lastGroup = group;
    }
    container.appendChild(entry);
  });
}

function sortReportEntries() {
  const tableBody = document.querySelector(".speaker-table tbody");
  const cards = [...speakerList.querySelectorAll(".speaker-card")];
  const rows = [...tableBody.querySelectorAll("tr[data-report-id]")];

  insertGroupSeparators(tableBody, rows.sort(compareEntries), createTableGroupRow);
  insertGroupSeparators(speakerList, cards.sort(compareEntries), createCardGroupHeading);
}

function updateGroupSeparators(cards) {
  speakerList.querySelectorAll(".report-group-heading").forEach((heading) => {
    const group = Number(heading.dataset.reportGroup);
    heading.hidden = !cards.some((card) => !card.hidden && reportGroup(card) === group);
  });

  document.querySelectorAll(".speaker-table .report-group-row").forEach((row) => {
    const group = Number(row.dataset.reportGroup);
    row.hidden = !tableRows.some((tableRow) => !tableRow.hidden && reportGroup(tableRow) === group);
  });
}

function updateResults() {
  if (!speakerList || !searchInput) return;

  const query = searchInput.value.trim().toLowerCase();
  const cards = [...speakerList.querySelectorAll(".speaker-card")];
  const selectedYear = yearFilter ? yearFilter.value : "all";
  const pageSizeValue = pageSizeSelect ? pageSizeSelect.value : "all";
  const pageSize = pageSizeValue === "all" ? Infinity : Number(pageSizeValue);

  const matches = cards.filter((card) => {
    const yearMatch = selectedYear === "all" || card.dataset.year === selectedYear;
    const text = [
      card.dataset.name,
      card.dataset.affiliation,
      card.dataset.topic,
      card.textContent
    ].join(" ").toLowerCase();
    return yearMatch && text.includes(query);
  });

  const totalPages = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(matches.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const start = pageSize === Infinity ? 0 : (currentPage - 1) * pageSize;
  const end = pageSize === Infinity ? matches.length : start + pageSize;
  const visibleIds = new Set(matches.slice(start, end).map((card) => card.dataset.reportId));

  cards.forEach((card) => {
    card.hidden = !visibleIds.has(card.dataset.reportId);
  });

  tableRows.forEach((row) => {
    const text = [
      row.dataset.name,
      row.dataset.affiliation,
      row.dataset.topic,
      row.textContent
    ].join(" ").toLowerCase();
    const yearMatch = selectedYear === "all" || row.dataset.year === selectedYear;
    const match = yearMatch && text.includes(query);
    row.hidden = !match || !visibleIds.has(row.dataset.reportId);
  });

  updateGroupSeparators(cards);

  if (resultCount) {
    resultCount.textContent = `${matches.length} speaker${matches.length === 1 ? "" : "s"}`;
  }
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
  if (prevPageButton) prevPageButton.disabled = currentPage <= 1;
  if (nextPageButton) nextPageButton.disabled = currentPage >= totalPages;
}

function resetAndUpdate() {
  currentPage = 1;
  updateResults();
}

if (searchInput) {
  sortReportEntries();
  searchInput.addEventListener("input", resetAndUpdate);
  yearFilter?.addEventListener("change", resetAndUpdate);
  pageSizeSelect?.addEventListener("change", resetAndUpdate);
  prevPageButton?.addEventListener("click", () => {
    currentPage = Math.max(1, currentPage - 1);
    updateResults();
  });
  nextPageButton?.addEventListener("click", () => {
    currentPage += 1;
    updateResults();
  });
  updateResults();
}
