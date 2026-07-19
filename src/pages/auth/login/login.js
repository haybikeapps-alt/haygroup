import { login, getProfile } from "../../../lib/auth.js";
import { qs } from "../../../lib/utils.js";

// jika sudah login, langsung arahkan ke dashboard
import { getSession } from "../../../lib/auth.js";
const existing = await getSession();
if (existing) {
  window.location.href = "/src/pages/dashboard/index.html";
}

qs("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = qs("#errorMsg");
  errorEl.style.display = "none";

  const email = qs("#email").value.trim();
  const password = qs("#password").value;

  try {
    await login(email, password);
    const profile = await getProfile();
    if (profile?.must_change_password) {
      window.location.href = "./change-password.html";
    } else {
      window.location.href = "/src/pages/dashboard/index.html";
    }
  } catch (err) {
    errorEl.textContent = err.message === "Invalid login credentials"
      ? "Email atau password salah."
      : err.message;
    errorEl.style.display = "block";
  }
});
