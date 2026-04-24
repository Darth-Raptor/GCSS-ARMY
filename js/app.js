const requestForm = document.getElementById("requestForm");

const unitSelect = document.getElementById("unit");
const requestedByInput = document.getElementById("requestedBy");
const deliveryLocationSelect = document.getElementById("deliveryLocation");

const requestIdDisplay = document.getElementById("requestIdDisplay");
const requestDateDisplay = document.getElementById("requestDateDisplay");

const requestSummaryInput = document.getElementById("requestSummary");
const prioritySelect = document.getElementById("priority");

const itemSearchInput = document.getElementById("itemSearch");
const selectedCatalogItemDisplay = document.getElementById("selectedCatalogItemDisplay");
const itemQuantityInput = document.getElementById("itemQuantity");
const addItemBtn = document.getElementById("addItemBtn");
const reviewRequestBtn = document.getElementById("reviewRequestBtn");
const selectedItemsContainer = document.getElementById("selectedItemsContainer");

const catalogContainer = document.getElementById("catalogContainer");
const catalogCount = document.getElementById("catalogCount");

const requestPreview = document.getElementById("requestPreview");
const codeOutput = document.getElementById("codeOutput");

let itemCatalog = [];
let selectedItems = [];
let currentZuluDtg = "";
let currentZuluDateForOutput = "";
let selectedCatalogItemClassName = null;

let reportIdLocked = false;
let lockedReportId = "";
let lockedRequestDtg = "";
let lockedRequestDate = "";

function getStoredReviewData() {
  const raw = sessionStorage.getItem("gcssArmyReviewRequest");

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse stored review data.", error);
    return null;
  }
}

function getStoredSuccessData() {
  const raw = sessionStorage.getItem("gcssArmySubmissionSuccess");

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse stored success data.", error);
    return null;
  }
}

function clearSubmissionSuccessState() {
  sessionStorage.removeItem("gcssArmySubmissionSuccess");
}

function loadLockedStateFromReviewData() {
  const reviewData = getStoredReviewData();

  if (!reviewData || !reviewData.requestId || !reviewData.requestDtg) {
    return false;
  }

  reportIdLocked = true;
  lockedReportId = reviewData.requestId;
  lockedRequestDtg = reviewData.requestDtg;
  lockedRequestDate = reviewData.requestDate || "";

  currentZuluDtg = lockedRequestDtg;
  currentZuluDateForOutput = lockedRequestDate || "";

  requestIdDisplay.textContent = lockedReportId;
  requestDateDisplay.textContent = lockedRequestDtg;

  return true;
}

function saveLockedReviewState(payload) {
  sessionStorage.setItem("gcssArmyReviewRequest", JSON.stringify(payload));
}

async function loadJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status})`);
  }

  return response.json();
}

async function loadText(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status})`);
  }

  return response.text();
}

function populateSelect(selectElement, values, placeholderText) {
  selectElement.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholderText;
  selectElement.appendChild(placeholderOption);

  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  }
}

function normalizeHeader(header) {
  return header.trim().toUpperCase().replace(/\s+/g, " ");
}

function parseItemsText(text) {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line !== "");

  if (lines.length < 2) {
    throw new Error("items.txt does not contain enough rows.");
  }

  const header = lines[0].split("\t").map(normalizeHeader);
  const expected = ["DISPLAY NAME", "CLASS NAME", "CARGO BUCKET", "SPAWN COMMAND"];

  if (header.length !== 4 || expected.some((name, index) => header[index] !== name)) {
    throw new Error(
      "items.txt header is invalid. Expected tab-separated columns: DISPLAY NAME, CLASS NAME, CARGO BUCKET, SPAWN COMMAND"
    );
  }

  const catalog = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split("\t");

    if (parts.length !== 4) {
      continue;
    }

    const [displayName, className, cargoBucket, spawnCommand] = parts.map(part => part.trim());

    if (!displayName || !className || !cargoBucket || !spawnCommand) {
      continue;
    }

    catalog.push({
      displayName,
      className,
      cargoBucket,
      spawnCommand
    });
  }

  return catalog;
}

function getZuluNow() {
  return new Date();
}

function formatZuluDtg(date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");

  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const month = months[date.getUTCMonth()];
  const year = String(date.getUTCFullYear()).slice(-2);

  return `${day}${hour}${minute}Z${month}${year}`;
}

function formatZuluDateForOutput(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function randomRequestNoise(length = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "";

  for (let i = 0; i < length; i++) {
    output += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return output;
}

function generateRequestId() {
  return `${currentZuluDtg}-${randomRequestNoise(4)}`;
}

function updateCurrentZuluDisplays() {
  if (reportIdLocked) {
    requestDateDisplay.textContent = lockedRequestDtg;
    requestIdDisplay.textContent = lockedReportId;
    currentZuluDtg = lockedRequestDtg;
    currentZuluDateForOutput = lockedRequestDate || currentZuluDateForOutput;
    return;
  }

  const now = getZuluNow();
  currentZuluDtg = formatZuluDtg(now);
  currentZuluDateForOutput = formatZuluDateForOutput(now);

  requestDateDisplay.textContent = currentZuluDtg;
}

function updateRequestIdDisplay() {
  if (reportIdLocked) {
    requestIdDisplay.textContent = lockedReportId;
    return;
  }

  requestIdDisplay.textContent = generateRequestId();
}

function lockCurrentReportIdentity() {
  if (reportIdLocked) {
    return;
  }

  updateCurrentZuluDisplays();

  lockedRequestDtg = currentZuluDtg;
  lockedRequestDate = currentZuluDateForOutput;
  lockedReportId = generateRequestId();
  reportIdLocked = true;

  requestDateDisplay.textContent = lockedRequestDtg;
  requestIdDisplay.textContent = lockedReportId;
}

function getCatalogItemByClassName(className) {
  return itemCatalog.find(item => item.className === className) || null;
}

function renderSelectedCatalogItem() {
  const item = getCatalogItemByClassName(selectedCatalogItemClassName);
  selectedCatalogItemDisplay.textContent = item ? item.displayName : "None selected";
}

function getFilteredCatalog(query) {
  const q = query.trim().toLowerCase();
  const sortedCatalog = [...itemCatalog].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  if (!q) {
    return sortedCatalog;
  }

  return sortedCatalog.filter(item =>
    item.displayName.toLowerCase().includes(q) ||
    item.className.toLowerCase().includes(q)
  );
}

function renderCatalog() {
  const filteredCatalog = getFilteredCatalog(itemSearchInput.value);

  catalogContainer.innerHTML = "";
  catalogCount.textContent = `${filteredCatalog.length} items`;

  for (const item of filteredCatalog) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "catalog-row";
    row.textContent = item.displayName;
    row.title = item.displayName;

    if (item.className === selectedCatalogItemClassName) {
      row.classList.add("selected");
    }

    row.addEventListener("click", () => {
      selectedCatalogItemClassName = item.className;
      renderSelectedCatalogItem();
      renderCatalog();
      itemQuantityInput.focus();
      requestPreview.textContent = `Selected catalog item: ${item.displayName}`;
      codeOutput.textContent = "Compiled Arma code will appear here.";
    });

    catalogContainer.appendChild(row);
  }
}

function resetAfterAdd() {
  itemQuantityInput.value = "";
  itemQuantityInput.focus();
}

function renderSelectedItems() {
  selectedItemsContainer.innerHTML = "";

  for (const item of selectedItems) {
    const row = document.createElement("div");
    row.className = "selected-item-row";

    const nameBlock = document.createElement("div");
    nameBlock.className = "selected-item-name";
    nameBlock.textContent = item.catalogItem.displayName;

    const qtyBlock = document.createElement("div");
    qtyBlock.className = "selected-item-qty";
    qtyBlock.textContent = item.quantity;

    const actionBlock = document.createElement("div");
    actionBlock.className = "selected-item-action";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-x-btn";
    removeBtn.textContent = "X";
    removeBtn.title = "Remove item";

    removeBtn.addEventListener("click", () => {
      const index = selectedItems.findIndex(
        entry => entry.className === item.className
      );
      if (index > -1) {
        selectedItems.splice(index, 1);
        renderSelectedItems();
      }
    });

    actionBlock.appendChild(removeBtn);

    row.appendChild(nameBlock);
    row.appendChild(qtyBlock);
    row.appendChild(actionBlock);

    selectedItemsContainer.appendChild(row);
  }
}

function addSelectedItem() {
  const catalogItem = getCatalogItemByClassName(selectedCatalogItemClassName);
  const quantity = Number(itemQuantityInput.value.trim());

  if (!catalogItem) {
    requestPreview.textContent = "Select an item in the catalog.";
    codeOutput.textContent = "No compile output yet.";
    return;
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    requestPreview.textContent = "Quantity must be a whole number greater than 0.";
    codeOutput.textContent = "No compile output yet.";
    return;
  }

  const existingItem = selectedItems.find(item => item.className === catalogItem.className);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    selectedItems.push({
      className: catalogItem.className,
      quantity,
      catalogItem
    });
  }

  renderSelectedItems();
  resetAfterAdd();

  requestPreview.textContent = "Item added. Fill out the form and click Review Request.";
  codeOutput.textContent = "Compiled Arma code will appear here.";
}

function collectFormData() {
  return {
    requestId: reportIdLocked ? lockedReportId : requestIdDisplay.textContent,
    requestDate: reportIdLocked ? lockedRequestDate : currentZuluDateForOutput,
    requestDtg: reportIdLocked ? lockedRequestDtg : currentZuluDtg,
    priority: prioritySelect.value,
    unit: unitSelect.value,
    requestedBy: requestedByInput.value.trim(),
    deliveryLocation: deliveryLocationSelect.value,
    requestSummary: requestSummaryInput.value.trim(),
    items: selectedItems.map(item => ({
      className: item.className,
      quantity: item.quantity,
      catalogItem: item.catalogItem
    }))
  };
}

function validateFormData(formData) {
  const errors = [];

  if (!formData.requestDtg) errors.push("Zulu DTG is missing.");
  if (!formData.requestId) errors.push("Request ID is missing.");
  if (!formData.priority) errors.push("Priority is required.");
  if (!formData.unit) errors.push("Unit is required.");
  if (!formData.requestedBy) errors.push("Requested By is required.");
  if (!formData.deliveryLocation) errors.push("Delivery Location is required.");
  if (!formData.requestSummary) errors.push("Request Summary is required.");

  if (formData.items.length === 0) {
    errors.push("At least one item is required.");
  }

  formData.items.forEach((item, index) => {
    const rowNumber = index + 1;

    if (!item.catalogItem) {
      errors.push(`Added item ${rowNumber}: selected item was not found in the catalog.`);
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors.push(`Added item ${rowNumber}: quantity must be a whole number greater than 0.`);
    }
  });

  return errors;
}

function aggregateItemsBySpawnCommand(items) {
  const grouped = {
    addWeaponCargoGlobal: new Map(),
    addMagazineCargoGlobal: new Map(),
    addItemCargoGlobal: new Map(),
    addBackpackCargoGlobal: new Map()
  };

  for (const item of items) {
    const { className, spawnCommand } = item.catalogItem;
    const map = grouped[spawnCommand];

    if (!map) {
      continue;
    }

    const currentQty = map.get(className) || 0;
    map.set(className, currentQty + item.quantity);
  }

  return grouped;
}

function mapToArray(map) {
  return Array.from(map.entries()).map(([className, quantity]) => [className, quantity]);
}

function buildCompiledCode(grouped) {
  return [
    mapToArray(grouped.addWeaponCargoGlobal),
    mapToArray(grouped.addMagazineCargoGlobal),
    mapToArray(grouped.addItemCargoGlobal),
    mapToArray(grouped.addBackpackCargoGlobal)
  ];
}

function formatSqfValue(value) {
  if (Array.isArray(value)) {
    return `[${value.map(formatSqfValue).join(",")}]`;
  }

  if (typeof value === "string") {
    return `"${value}"`;
  }

  return String(value);
}

function buildRequestPreview(formData, compiledCode) {
  const lines = [
    `LOGISTICS REQUEST – ${formData.unit}`,
    "",
    `Request ID: ${formData.requestId}`,
    `DTG: ${formData.requestDtg}`,
    `Priority: ${formData.priority}`,
    `Requested By: ${formData.requestedBy}`,
    `Delivery Location: ${formData.deliveryLocation}`,
    "",
    "Summary:",
    formData.requestSummary,
    "",
    "Items:"
  ];

  for (const item of formData.items) {
    lines.push(
      `- ${item.catalogItem.displayName} | ${item.catalogItem.className} | ${item.catalogItem.cargoBucket} | ${item.catalogItem.spawnCommand} | Qty: ${item.quantity}`
    );
  }

  lines.push("");
  lines.push("Compiled Code:");
  lines.push(formatSqfValue(compiledCode));

  return lines.join("\n");
}

function buildCompiledPackage() {
  if (!reportIdLocked) {
    lockCurrentReportIdentity();
  }

  const formData = collectFormData();
  const errors = validateFormData(formData);

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  const grouped = aggregateItemsBySpawnCommand(formData.items);
  const compiledCode = buildCompiledCode(grouped);
  const compiledCodeText = formatSqfValue(compiledCode);
  const requestPreviewText = buildRequestPreview(formData, compiledCode);

  return {
    ok: true,
    formData,
    compiledCode,
    compiledCodeText,
    requestPreviewText
  };
}

function compileRequest(event) {
  event.preventDefault();

  const result = buildCompiledPackage();

  if (!result.ok) {
    requestPreview.textContent = result.errors.join("\n");
    codeOutput.textContent = "Fix the validation errors above.";
    return;
  }

  requestPreview.textContent = result.requestPreviewText;
  codeOutput.textContent = result.compiledCodeText;
}

function reviewRequest() {
  const result = buildCompiledPackage();

  if (!result.ok) {
    requestPreview.textContent = result.errors.join("\n");
    codeOutput.textContent = "Fix the validation errors above.";
    return;
  }

  requestPreview.textContent = result.requestPreviewText;
  codeOutput.textContent = result.compiledCodeText;

  const reviewPayload = {
    ...result.formData,
    compiledCode: result.compiledCode,
    compiledCodeText: result.compiledCodeText,
    requestPreviewText: result.requestPreviewText
  };

  saveLockedReviewState(reviewPayload);
  window.location.href = "review.html";
}

function addItemOnEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    addSelectedItem();
  }
}

function handleCatalogSearchInput() {
  renderCatalog();
}

function hydrateFormFromReviewData() {
  const reviewData = getStoredReviewData();

  if (!reviewData) {
    return;
  }

  if (reviewData.priority) {
    prioritySelect.value = reviewData.priority;
  }

  if (reviewData.unit) {
    unitSelect.value = reviewData.unit;
  }

  if (reviewData.requestedBy) {
    requestedByInput.value = reviewData.requestedBy;
  }

  if (reviewData.deliveryLocation) {
    deliveryLocationSelect.value = reviewData.deliveryLocation;
  }

  if (reviewData.requestSummary) {
    requestSummaryInput.value = reviewData.requestSummary;
  }

  if (Array.isArray(reviewData.items)) {
    selectedItems = reviewData.items.map(item => ({
      className: item.className,
      quantity: item.quantity,
      catalogItem: item.catalogItem
    }));
  }
}

async function initializeForm() {
  try {
    const [units, locations, itemsText] = await Promise.all([
      loadJson("data/units.json"),
      loadJson("data/locations.json"),
      loadText("items.txt")
    ]);

    itemCatalog = parseItemsText(itemsText);

    populateSelect(unitSelect, units, "Select unit");
    populateSelect(deliveryLocationSelect, locations, "Select location");

    clearSubmissionSuccessState();
    hydrateFormFromReviewData();

    const loadedLockedState = loadLockedStateFromReviewData();

    if (!loadedLockedState) {
      updateCurrentZuluDisplays();
      updateRequestIdDisplay();
    }

    renderSelectedCatalogItem();
    renderCatalog();
    renderSelectedItems();

    setInterval(() => {
      if (!reportIdLocked) {
        updateCurrentZuluDisplays();
      }
    }, 1000);

    itemSearchInput.addEventListener("input", handleCatalogSearchInput);

    addItemBtn.addEventListener("click", addSelectedItem);
    reviewRequestBtn.addEventListener("click", reviewRequest);

    itemSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
      }
    });

    itemQuantityInput.addEventListener("keydown", addItemOnEnter);

    requestForm.addEventListener("submit", compileRequest);

    requestPreview.textContent = reportIdLocked
      ? "Report ID locked from review state. Edit as needed and click Review Request to continue."
      : "Fill out the form, add items, and click Review Request.";

    codeOutput.textContent = "Compiled Arma code will appear here.";
  } catch (error) {
    console.error(error);
    requestPreview.textContent = `Error: ${error.message}`;
    codeOutput.textContent = "Failed to load one or more data files.";
  }
}

initializeForm();