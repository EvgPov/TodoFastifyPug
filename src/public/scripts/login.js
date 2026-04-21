import { showMessage } from './add-task.js'

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = form.username.value.trim();
    const password = form.password.value;

    if (!username || !password) {
      showMessage("Заполните все поля", "error")
      return
    }

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Неверный логин или пароль");

      if (data.token) {
        document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        console.log("Token saved to cookie");
      }  
      
      showMessage("Вход выполнен успешно! Загружаем задачи...", "success");

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);

    } catch (err) {
      showMessage(err.message, "error");
    }
  });
});