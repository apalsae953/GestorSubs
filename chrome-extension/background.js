// SubScout — Background Service Worker
// Monitors tab URL changes and auto-logs usage when a subscription domain is visited

const SUBSCOUT_URL = "http://localhost:3000"; // Change to production URL when deployed

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only fire when the page finishes loading and has a URL
  if (changeInfo.status !== "complete" || !tab.url) return;

  // Ignore chrome:// and extension pages
  if (!tab.url.startsWith("http")) return;

  const session = await getSession();
  if (!session?.access_token) return;

  try {
    const res = await fetch(`${SUBSCOUT_URL}/api/log-usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ url: tab.url }),
    });

    if (!res.ok) return;

    const data = await res.json();

    if (data.matched && !data.alreadyLoggedToday) {
      // Show badge briefly
      chrome.action.setBadgeText({ text: "✓", tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId });

      // Store last matched result for popup
      chrome.storage.local.set({
        lastMatch: {
          name: data.subscription,
          url: tab.url,
          time: Date.now(),
        },
      });

      // Clear badge after 4 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "", tabId });
      }, 4000);
    }
  } catch (_) {
    // Network error — SubScout server might not be running
  }
});

// ── Session helpers ─────────────────────────────────────────────────────────────

async function getSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get("session", (result) => {
      resolve(result.session ?? null);
    });
  });
}
