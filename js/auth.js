const AUTH_STORAGE_KEY = "gcssArmyLoggedInUser";

function getLoggedInUser() {
  const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse stored auth state.", error);
    return null;
  }
}

function setLoggedInUser(user) {
  sessionStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      username: user.username,
      displayName: user.displayName
    })
  );
}

function clearLoggedInUser() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

function clearAppSessionState() {
  sessionStorage.removeItem("gcssArmyReviewRequest");
  sessionStorage.removeItem("gcssArmySubmissionSuccess");
}

function logoutUser() {
  clearLoggedInUser();
  clearAppSessionState();
  window.location.href = "login.html";
}

function isLoginPage() {
  const path = window.location.pathname.toLowerCase();
  return path.endsWith("/login.html") || path.endsWith("login.html");
}

function requireLogin() {
  if (isLoginPage()) {
    return;
  }

  const user = getLoggedInUser();

  if (!user) {
    window.location.href = "login.html";
  }
}

function redirectIfAlreadyLoggedIn() {
  if (!isLoginPage()) {
    return;
  }

  const user = getLoggedInUser();

  if (user) {
    window.location.href = "index.html";
  }
}

function handleLoginSubmit(event) {
  event.preventDefault();

  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");
  const loginError = document.getElementById("loginError");

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  const matchedUser = RP_USERS.find(
    user => user.username === username && user.password === password
  );

  if (!matchedUser) {
    loginError.textContent = "Invalid username or password.";
    return;
  }

  setLoggedInUser(matchedUser);
  window.location.href = "index.html";
}

function initializeLoginPage() {
  redirectIfAlreadyLoggedIn();

  const loginForm = document.getElementById("loginForm");

  if (!loginForm) {
    return;
  }

  loginForm.addEventListener("submit", handleLoginSubmit);
}

function initializeLogoutButtons() {
  const logoutButtons = document.querySelectorAll("[data-logout]");

  logoutButtons.forEach((button) => {
    button.addEventListener("click", () => {
      logoutUser();
    });
  });
}

requireLogin();
initializeLoginPage();
initializeLogoutButtons();