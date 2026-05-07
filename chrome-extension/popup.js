// SubScout Extension — Popup Script

const SUBSCOUT_URL = "http://localhost:3000"; // Change to production URL when deployed
const SUPABASE_URL  = "https://nuyvnwrvsptddzbznmuv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eXZud3J2c3B0ZGR6YnpubXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDg5NzgsImV4cCI6MjA5MzcyNDk3OH0.-IPC8j7kLL21vfeukzEMYMoeAl-zWQf8JNbKTrgQefg";

// ── DOM refs ────────────────────────────────────────────────────────────────────
const viewLogin     = document.getElementById("view-login");
const viewDashboard = document.getElementById("view-dashboard");
const loginError    = document.getElementById("login-error");
const btnLogin      = document.getElementById("btn-login");
const btnLogout     = document.getElementById("btn-logout");
const inputEmail    = document.getElementById("input-email");
const inputPassword = document.getElementById("input-password");
const userAvatar    = document.getElementById("user-avatar");
const userName      = document.getElementById("user-name");
const userEmail     = document.getElementById("user-email");
const matchContainer= document.getElementById("match-container");
const openAppLink   = document.getElementById("open-app");
const headerSub     = document.getElementById("header-sub");

// ── Init ────────────────────────────────────────────────────────────────────────
(async () => {
  const session = await getSession();
  if (session) {
    await showDashboard(session);
  } else {
    show("view-login");
  }
})();

// ── Login ───────────────────────────────────────────────────────────────────────
btnLogin.addEventListener("click", async () => {
  const email    = inputEmail.value.trim();
  const password = inputPassword.value;
  if (!email || !password) return;

  setLoading(btnLogin, true);
  loginError.style.display = "none";

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error_description ?? data.msg ?? "Error al iniciar sesión";
      loginError.style.display = "block";
      return;
    }

    // Store session
    const session = {
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
    };
    await saveSession(session);
    await showDashboard(session);

  } catch (e) {
    loginError.textContent = "No se pudo conectar con SubScout";
    loginError.style.display = "block";
  } finally {
    setLoading(btnLogin, false);
  }
});

// ── Logout ──────────────────────────────────────────────────────────────────────
btnLogout.addEventListener("click", async () => {
  await chrome.storage.local.remove(["session", "lastMatch"]);
  show("view-login");
  headerSub.textContent = "Gestor de suscripciones";
});

// ── Dashboard ───────────────────────────────────────────────────────────────────
async function showDashboard(session) {
  const user = session.user;
  const initial = (user.user_metadata?.full_name ?? user.email ?? "?")[0].toUpperCase();

  userAvatar.textContent = initial;
  userName.textContent   = user.user_metadata?.full_name ?? "Usuario";
  userEmail.textContent  = user.email;
  openAppLink.href       = SUBSCOUT_URL + "/dashboard";
  openAppLink.target     = "_blank";

  // Check current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab?.url ?? "";

  headerSub.textContent = new URL(currentUrl).hostname.replace("www.", "") || "–";

  // Check if this URL matches a subscription
  await checkCurrentTab(session.access_token, currentUrl);

  show("view-dashboard");
}

async function checkCurrentTab(accessToken, url) {
  if (!url.startsWith("http")) {
    renderNoMatch("Página del sistema — no es una suscripción");
    return;
  }

  try {
    const res = await fetch(`${SUBSCOUT_URL}/api/log-usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      renderNoMatch("No se pudo contactar SubScout");
      return;
    }

    const data = await res.json();

    if (data.matched) {
      renderMatch(data.subscription, data.alreadyLoggedToday);
    } else {
      // Check last match from storage
      const { lastMatch } = await chrome.storage.local.get("lastMatch");
      if (lastMatch && Date.now() - lastMatch.time < 60 * 60 * 1000) {
        renderNoMatch(`Esta web no es una suscripción tuya.\nÚltima registrada: ${lastMatch.name}`);
      } else {
        renderNoMatch("Esta web no coincide con ninguna suscripción tuya.");
      }
    }
  } catch {
    renderNoMatch("SubScout no está disponible.");
  }
}

function renderMatch(name, alreadyLogged) {
  matchContainer.innerHTML = `
    <div class="match-card">
      <div class="label">${alreadyLogged ? "✓ Ya registrada hoy" : "✓ Uso registrado ahora"}</div>
      <div class="name">${escHtml(name)}</div>
      <div class="detail">${alreadyLogged ? "Ya habías usado este servicio hoy." : "Se ha marcado como usada automáticamente."}</div>
    </div>`;
}

function renderNoMatch(msg) {
  matchContainer.innerHTML = `
    <div class="no-match">
      ${escHtml(msg)}
    </div>`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────
function show(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Cargando…'
    : "Iniciar sesión";
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function getSession() {
  return new Promise(resolve =>
    chrome.storage.local.get("session", r => resolve(r.session ?? null))
  );
}

function saveSession(session) {
  return new Promise(resolve =>
    chrome.storage.local.set({ session }, resolve)
  );
}
