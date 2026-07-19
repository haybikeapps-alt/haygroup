import { requireAuth, changePassword } from "../../../lib/auth.js";
import { qs } from "../../../lib/utils.js";

await requireAuth({ allowUnverifiedPassword: true });

qs("#cpForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = qs("#errorMsg");
  errorEl.style.display = "none";

  const p1 = qs("#newPassword").value;
  const p2 = qs("#confirmPassword").value;

  if (p1 !== p2) {
    errorEl.textContent = "Password tidak sama.";
    errorEl.style.display = "block";
    return;
  }
  if (p1 === "Haygroup#2026") {
    errorEl.textContent = "Password baru tidak boleh sama dengan password bawaan.";
    errorEl.style.display = "block";
    return;
  }

  try {
    await changePassword(p1);
    window.location.href = "/src/pages/dashboard/index.html";
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
  }
});
