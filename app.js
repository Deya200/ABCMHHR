(function () {
  const form = document.getElementById("feedbackForm");
  const anonToggle = document.getElementById("anonToggle");
  const nameField = document.getElementById("nameField");
  const nameInput = document.getElementById("nameInput");
  const message = document.getElementById("message");
  const charCount = document.getElementById("charCount");
  const submitBtn = document.getElementById("submitBtn");
  const statusMsg = document.getElementById("statusMsg");
  const formView = document.getElementById("formView");
  const successView = document.getElementById("successView");
  const resetBtn = document.getElementById("resetBtn");

  function syncAnon() {
    const anon = anonToggle.checked;
    nameField.classList.toggle("hidden", anon);
    nameInput.disabled = anon;
    if (anon) nameInput.value = "";
  }
  anonToggle.addEventListener("change", syncAnon);
  syncAnon();

  message.addEventListener("input", () => {
    charCount.textContent = message.value.length;
  });

  function showStatus(text, kind) {
    statusMsg.textContent = text;
    statusMsg.className = "status-msg " + kind;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusMsg.className = "status-msg";

    const category = document.getElementById("category").value;
    const department = document.getElementById("department").value;
    const anonymous = anonToggle.checked;
    const name = nameInput.value;
    const msg = message.value.trim();

    if (!msg) {
      showStatus("Please add a message before sending.", "error");
      return;
    }
    if (!category) {
      showStatus("Please choose a category.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    try {
      const res = await fetch("/api/submit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymous,
          name,
          department,
          category,
          message: msg,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      formView.style.display = "none";
      successView.classList.add("active");
    } catch (err) {
      console.error(err);
      showStatus("Something went wrong sending your feedback. Please try again in a moment.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send to HR";
    }
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    syncAnon();
    charCount.textContent = "0";
    successView.classList.remove("active");
    formView.style.display = "block";
  });
})();
