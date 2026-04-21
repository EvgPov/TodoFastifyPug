import { showMessage } from './add-task.js'

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  if (!form) return

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = form.username.value.trim();
    const password = form.password.value;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      showMessage("Пароль должен содержать минимум 8 символов, заглавную букву, строчную букву и цифру", "error");
      return;
    }
    
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

      form.username.value = "";
      form.password.value = "";

      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      
      // setTimeout(() => window.location.href = "/login", 1200);
    } catch (err) {
      showMessage(err.message, "error");
    }
  });
});