const successRequestId = document.getElementById("successRequestId");
const successDtg = document.getElementById("successDtg");
const successStatus = document.getElementById("successStatus");
const successDetails = document.getElementById("successDetails");
const newRequestBtn = document.getElementById("newRequestBtn");

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

function addDetailRow(label, value) {
  const labelDiv = document.createElement("div");
  labelDiv.className = "review-label";
  labelDiv.textContent = label;

  const valueDiv = document.createElement("div");
  valueDiv.className = "review-value";
  valueDiv.textContent = value || "";

  successDetails.appendChild(labelDiv);
  successDetails.appendChild(valueDiv);
}

function renderMissingState() {
  successRequestId.textContent = "NO SUBMISSION DATA";
  successDtg.textContent = "";
  successStatus.textContent = "No submission data was found for this page.";

  successDetails.innerHTML = "";
  addDetailRow("Status", "Open the request form and submit a request first.");
}

function renderSuccessPage(data) {
  successRequestId.textContent = data.requestId || "";
  successDtg.textContent = data.requestDtg || "";
  successStatus.textContent = "Request submitted successfully.";

  successDetails.innerHTML = "";
  addDetailRow("Airtable Record ID", data.airtableRecordId || "");
  addDetailRow("Unit", data.unit || "");
  addDetailRow("Priority", data.priority || "");
  addDetailRow("Requested By", data.requestedBy || "");
  addDetailRow("Delivery Location", data.deliveryLocation || "");
}

function initializeSuccessPage() {
  const data = getStoredSuccessData();

  if (!data) {
    renderMissingState();
  } else {
    renderSuccessPage(data);
  }

  newRequestBtn.addEventListener("click", () => {
    sessionStorage.removeItem("gcssArmyReviewRequest");
    sessionStorage.removeItem("gcssArmySubmissionSuccess");
    window.location.href = "supply-request.html";
  });
}

initializeSuccessPage();