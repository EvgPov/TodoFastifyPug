import { showMessage } from './add-task.js'

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = form.username.value.trim();
    const password = form.password.value;

    if (!username || !password) {
      showMessage("Заполните все поля", "error")
      return
    }

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Ощибка регистрации");

      showMessage("Регистрация прошла успешно!", "success");
      setTimeout(() => window.location.href = "/login", 1200);
    } catch (err) {
      showMessage(err.message, "error");
    }
  });
});