const reviewRequestId = document.getElementById("reviewRequestId");
const reviewDtg = document.getElementById("reviewDtg");
const reviewDetails = document.getElementById("reviewDetails");
const reviewSummary = document.getElementById("reviewSummary");
const reviewItems = document.getElementById("reviewItems");
const reviewCode = document.getElementById("reviewCode");

const backToEditBtn = document.getElementById("backToEditBtn");
const submitRequestBtn = document.getElementById("submitRequestBtn");

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

function addDetailRow(label, value) {
  const labelDiv = document.createElement("div");
  labelDiv.className = "review-label";
  labelDiv.textContent = label;

  const valueDiv = document.createElement("div");
  valueDiv.className = "review-value";
  valueDiv.textContent = value || "";

  reviewDetails.appendChild(labelDiv);
  reviewDetails.appendChild(valueDiv);
}

function renderReviewPage(data) {
  reviewRequestId.textContent = data.requestId || "";
  reviewDtg.textContent = data.requestDtg || "";

  reviewDetails.innerHTML = "";
  addDetailRow("Priority", data.priority);
  addDetailRow("Unit", data.unit);
  addDetailRow("Requested By", data.requestedBy);
  addDetailRow("Delivery Location", data.deliveryLocation);

  reviewSummary.textContent = data.requestSummary || "";

  reviewItems.innerHTML = "";
  if (Array.isArray(data.items) && data.items.length > 0) {
    data.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "review-item-row";

      const nameDiv = document.createElement("div");
      nameDiv.className = "review-item-name";
      nameDiv.textContent = item.catalogItem?.displayName || item.className || "";

      const qtyDiv = document.createElement("div");
      qtyDiv.className = "review-item-qty";
      qtyDiv.textContent = `QTY: ${item.quantity}`;

      row.appendChild(nameDiv);
      row.appendChild(qtyDiv);
      reviewItems.appendChild(row);
    });
  } else {
    const row = document.createElement("div");
    row.className = "review-item-row";

    const nameDiv = document.createElement("div");
    nameDiv.className = "review-item-name";
    nameDiv.textContent = "No items found.";

    const qtyDiv = document.createElement("div");
    qtyDiv.className = "review-item-qty";
    qtyDiv.textContent = "";

    row.appendChild(nameDiv);
    row.appendChild(qtyDiv);
    reviewItems.appendChild(row);
  }

  reviewCode.textContent = data.compiledCodeText || "";
}

function renderMissingDataState() {
  reviewRequestId.textContent = "NO REVIEW DATA";
  reviewDtg.textContent = "";
  reviewDetails.innerHTML = "";

  addDetailRow("Status", "No request data was found in session storage.");

  reviewSummary.textContent = "Return to the request form and generate a review package first.";

  reviewItems.innerHTML = "";
  const row = document.createElement("div");
  row.className = "review-item-row";

  const nameDiv = document.createElement("div");
  nameDiv.className = "review-item-name";
  nameDiv.textContent = "No items available.";

  const qtyDiv = document.createElement("div");
  qtyDiv.className = "review-item-qty";
  qtyDiv.textContent = "";

  row.appendChild(nameDiv);
  row.appendChild(qtyDiv);
  reviewItems.appendChild(row);

  reviewCode.textContent = "No compiled code available.";

  submitRequestBtn.disabled = true;
}

function getCreateRecordEndpoint() {
  if (
    typeof AIRTABLE_CONFIG === "undefined" ||
    !AIRTABLE_CONFIG ||
    !AIRTABLE_CONFIG.baseId ||
    !AIRTABLE_CONFIG.token
  ) {
    throw new Error("Airtable config is missing or incomplete.");
  }

  if (AIRTABLE_CONFIG.tableId) {
    return `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tableId}`;
  }

  if (AIRTABLE_CONFIG.tableName) {
    return `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${encodeURIComponent(AIRTABLE_CONFIG.tableName)}`;
  }

  throw new Error("Airtable tableId or tableName is required.");
}

function getAttachmentUploadEndpoint(recordId) {
  if (!AIRTABLE_CONFIG.attachmentFieldName) {
    throw new Error("Airtable attachmentFieldName is missing.");
  }

  return `https://content.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${recordId}/${encodeURIComponent(AIRTABLE_CONFIG.attachmentFieldName)}/uploadAttachment`;
}

function buildAirtableRecordBody(data) {
  return {
    fields: {
      "REPORT ID": data.requestId,
      "PRIORITY": data.priority,
      "UNIT": data.unit,
      "REQUESTED BY": data.requestedBy,
      "DELIVERY LOCATION": data.deliveryLocation,
      "REQUEST SUMMARY": data.requestSummary,
      "CODE": data.compiledCodeText,
      "STATUS": data.status || "SUBMITTED"
    }
  };
}

async function createAirtableRecord(data) {
  const endpoint = getCreateRecordEndpoint();
  const body = buildAirtableRecordBody(data);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${AIRTABLE_CONFIG.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();

  if (!response.ok) {
    const message =
      result?.error?.message ||
      result?.error?.type ||
      "Failed to create Airtable record.";
    throw new Error(message);
  }

  return result;
}

async function textToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function uploadSqfAttachment(recordId, reportId, codeText) {
  const endpoint = getAttachmentUploadEndpoint(recordId);
  const filename = `${reportId}.sqf`;
  const fileBase64 = await textToBase64(codeText);

  const body = {
    contentType: "text/plain",
    filename,
    file: fileBase64
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${AIRTABLE_CONFIG.token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();

  if (!response.ok) {
    const message =
      result?.error?.message ||
      result?.error?.type ||
      "Failed to upload SQF attachment.";
    throw new Error(message);
  }

  return result;
}

function storeSuccessState(data, airtableRecordId) {
  const payload = {
    requestId: data.requestId,
    requestDtg: data.requestDtg,
    priority: data.priority,
    unit: data.unit,
    requestedBy: data.requestedBy,
    deliveryLocation: data.deliveryLocation,
    airtableRecordId
  };

  sessionStorage.setItem("gcssArmySubmissionSuccess", JSON.stringify(payload));
}

async function handleSubmitRequest() {
  const data = getStoredReviewData();

  if (!data) {
    alert("No review data found. Return to the request form first.");
    return;
  }

  submitRequestBtn.disabled = true;
  backToEditBtn.disabled = true;
  submitRequestBtn.textContent = "Submitting...";

  try {
    const createResult = await createAirtableRecord(data);
    await uploadSqfAttachment(createResult.id, data.requestId, data.compiledCodeText);

    storeSuccessState(data, createResult.id);
    sessionStorage.removeItem("gcssArmyReviewRequest");
    window.location.href = "success.html";
  } catch (error) {
    console.error(error);
    submitRequestBtn.disabled = false;
    backToEditBtn.disabled = false;
    submitRequestBtn.textContent = "Submit Request";
    alert(`Submission failed: ${error.message}`);
  }
}

function initializeReviewPage() {
  const data = getStoredReviewData();

  if (!data) {
    renderMissingDataState();
  } else {
    renderReviewPage(data);
  }

  backToEditBtn.addEventListener("click", () => {
    window.location.href = "supply-request.html";
  });

  submitRequestBtn.addEventListener("click", handleSubmitRequest);
}

initializeReviewPage();