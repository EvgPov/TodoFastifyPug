const MAX_TASK_LENGTH = 150;    // Максимальная длина, которую сохраняем на сервере
const MAX_DISPLAY_LENGTH = 45;  // Сколько символов показывать в списке задач
const MAX_MESSAGE_LENGTH = 35; // Сколько символов показывать в сообщениях

let clickTimer = null
let pendingTaskId = null

function shortenText(text, maxLength = MAX_MESSAGE_LENGTH) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '. . .';
}

function getToken() {
  const cookies = document.cookie.split('; ');
  const tokenCookie = cookies.find(row => row.startsWith('token='));
  if (tokenCookie) {
    const token = tokenCookie.split('=')[1];
    console.log("Token from cookie:", token ? "exists" : "not found");
    return token;
  }
  console.log("No token found");
  return null;
}

async function fetchWithAuth(url, options = {}) {
  const token = getToken()

  if (!token) {
    showMessage("Сначала войдите в аккаунт", "error")
    window.location.href = "/login"
    throw new Error("No token")
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  if (!headers['Content-Type'] && 
      options.body && 
      !['GET', 'DELETE', 'HEAD'].includes((options.method || 'GET').toUpperCase())) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOptions = {
    ...options,
    credentials: 'include',
    headers
  };

  const res = await fetch(url, fetchOptions)

  if (res.status === 401) {
    // Очищаем оба хранилища
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    showMessage("Сессия истекла. Войдите снова", "error")
    setTimeout(() => window.location.href = "/login", 1500);
    throw new Error("Unauthorized");
  }
  return res
}

// функция показа сообщений
  function showMessage(text, type = 'info') {
    const existing = document.querySelector(`.message-${type}`)
    if (existing) existing.remove()

    const messageDiv = document.createElement('div')
    messageDiv.className = `message message-${type}`
    messageDiv.innerHTML = `
        <span>${text}</span>
        <button class="message-close">×</button>
    `
    document.body.appendChild(messageDiv)
// сообщение исчезает через 3 секунды, если пользователь не закрыл сообщение
    messageDiv.timer = setTimeout(() => {
       if (messageDiv && messageDiv.remove) messageDiv.remove()
    }, 3000)

// пользователь закрывает  сообщение
    const closeBtn = messageDiv.querySelector('.message-close')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (messageDiv.timer) clearTimeout(messageDiv.timer)
        messageDiv.remove()
      })
    }
  }  

function createTaskElement(task) {
  const li = document.createElement('li')
  li.className = 'task-item'
  li.dataset.id = task.id

  const fullTitle = task.title || ''

  // Сокращаем ТОЛЬКО для отображения в списке
  const displayTitle = fullTitle.length > MAX_DISPLAY_LENGTH
    ? fullTitle.substring(0, MAX_DISPLAY_LENGTH) + '. . .'
    : fullTitle

  li.innerHTML = `
    <div class="task-content">
      <span class="task-text ${task.completed ? 'completed' : ''}"
            data-full-title="${fullTitle.replace(/"/g, '&quot;')}"
            title="${fullTitle.replace(/"/g, '&quot;')}">
        ${displayTitle}
      </span>
    </div>
    <a class="delete-link"
       href="#"
       title="Удалить задачу"
       data-id="${task.id}"
       data-title="${fullTitle.replace(/"/g, '&quot;')}">
      <img class="delete-icon"
           src="/public/images/trash-bin-trash-svgrepo-com.svg"
           alt="Удалить"
           width="24"
           height="24">
    </a>
  `
  return li
}

async function loadTasks() {
  const token = getToken()
  if (!token) return
  try {
    const res = await fetchWithAuth("/tasks")
    const tasksList = await res.json()
    const ul = document.getElementById("task-list")
    if (!ul) return
    ul.innerHTML = ""
    const emptyMessage = document.getElementById("empty-message")
    if (emptyMessage) empty-message.remove()
    if (tasksList.length === 0) {
      const p = document.createElement("p")
      p.textContent = "Пока задач нет"
      p.id = "empty-message"
      ul.parentElement.insertBefore(p, ul)
    } else {
      tasksList.forEach(task => {
        const li = createTaskElement(task)
        ul.append(li)
      })
    }
  } catch(error) {
    console.error("Ошибка загрузки задач:", error)
  }
}
function logout() {
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = "/login"
}
// только для  страницы Todo
document.addEventListener('DOMContentLoaded', () => {
const taskForm = document.getElementById('task-form')
if (!taskForm) return // если мы на register/login, то выходим

// кнопка выхода
const h1 = document.querySelector("h1")
if (h1 && h1.parentElement.classList.contains('header')) {
  const logoutBtn = document.createElement("button");
  logoutBtn.className = "logout-btn";
      logoutBtn.innerHTML = `
      <img src="public/images/logout_4750631.png" alt="Выход" width="28" height="28">
    `;
  logoutBtn.onclick = logout;
  h1.parentElement.appendChild(logoutBtn);
}
const token = getToken()
// загружаем задачи, елси етсь токен
if (token) {
  loadTasks()
} else {
  console.log("No token, redirecting to login")
  window.location.href = "/login"
}
// добавление задачи
taskForm.addEventListener('submit', async(event) => { 
  event.preventDefault()

  const input = taskForm.querySelector('input[name="title"]')
  let title = input.value.trim()

  if (!title) return

  // Ограничение длины
  if (title.length > MAX_TASK_LENGTH) {
    title = title.substring(0, MAX_TASK_LENGTH)
    showMessage(`Задача обрезана до ${MAX_TASK_LENGTH} символов`, 'info')
  }
  try {
    const response = await fetchWithAuth ('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ title })
    })
    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error || 'Ошибка сервера')
    }
    input.value = ''
    const data = await response.json()
    const newTask = data.task || {}

    const ul = document.getElementById('task-list')
    if (ul) {
      const emptyMessage = document.getElementById("empty-message")
      if (emptyMessage) emptyMessage.remove()

      ul.append(createTaskElement(newTask))
    }
    showMessage(`Задача успешно добавлена: ${shortenText(newTask.title)}`, 'success')
  } catch(err) {
    showMessage(err.message || 'Не удалось добавить задачу', 'error')
  }
})
// удаление задачи
document.getElementById('task-list').addEventListener('click', async function(event) {
  const link = event.target.closest('.delete-link')
  if (!link) return
  event.preventDefault()
  const id = link.getAttribute('data-id')
  if (!id) return
  const title = link.getAttribute('data-title') || 'задача'
  if (!confirm(`Вы уверены, что хотите удалить задачу "${title}"?`)) return
  try {
    const response = await fetchWithAuth (`/tasks/${id}`, {
      method: 'DELETE',
      headers: {}
    })
    if (response.ok) {
      link.closest('li').remove()
      showMessage(`Задача "${shortenText(title)}" успешно удалена`, 'success')
    } else if (response.status === 404) {
      showMessage('Задача уже удалена или у вас нет доступа', 'error')
      link.closest('li').remove()
    } else {
      const errData = await response.json().catch(() => ({}))
      showMessage(errData.error || `Не удалось удалить задачу: ${shortenText(title)}`, 'error')
    }
  } catch(error) {
    showMessage(`Ошибка при удалении задачи: ${shortenText(title)}`, 'error');
  }
})

// переключение completed по одинарному клику на задачу
document.getElementById('task-list').addEventListener('click', async function(event) {
  // пропускаем клики по кнопке удаления и по полю редактировани
  if (event.target.closest('.delete-link') || event.target.closest('.task-edit-input')) {
    return
  }
  const li = event.target.closest('.task-item')
  if (!li) return

  const id = li.dataset.id
  if(!id) return

  // Сохраняем ID задачи для возможного двойного клика
  pendingTaskId = id
  // очищаем предыдущий таймер, если есть
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
    // если таймер был, значит это двойной клик - не выполняем переключение
  }

  // устанавливаем тайме для выполнения переключения

  clickTimer = setTimeout(async () => {
    // проверяем, что это не двойной клик (ID не изменился)
    if (pendingTaskId === id) {
      // текущий статус из .completed на span
      const textSpan = li.querySelector('.task-text')
      const fullTitle = textSpan ? (textSpan.dataset.fullTitle || textSpan.textContent.trim()) : 'задача'

      const currentСompleted = textSpan.classList.contains('completed')
      // новый статус противоположный
      const newСompleted = !currentСompleted
      try {
        const response = await fetchWithAuth(`/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: newСompleted })
        });
        if (response.ok) {
          textSpan.classList.toggle('completed', newСompleted)
          
          showMessage(
            newСompleted 
            ? `Задача "${shortenText(fullTitle)}" выполнена!`
            : `Задача "${shortenText(fullTitle)}" отмечена как активная`, 'success'
          );
        } else {
          const errData = await response.json().catch(() => ({}))
          showMessage(errData.error || 'Не удалось обновить статус', 'error')
        }
      } catch(err) {
        showMessage('Ошибка обновления статуса', 'error')
      }
    }
 // Сбрасываем таймер и pending ID
    clickTimer = null
    pendingTaskId = null
  }, 200)
});
// редактирование (dblclick)
document.getElementById('task-list').addEventListener('dblclick', function(event) {
  // Очищаем таймер, чтобы не сработал одинарный клик
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
    pendingTaskId = null
  }

  const span = event.target.closest('.task-text')
  if (!span) return

  const li = span.closest('li')
  if (!li) return

  const id = li.dataset.id
  if (!id) return

  // Всегда берём ПОЛНУЮ версию из data-full-title
  const originalTitle = span.dataset.fullTitle || span.textContent.trim()

  const isLongText = originalTitle.length > 80

  const editElement = isLongText 
    ? document.createElement('textarea') 
    : document.createElement('input')

  editElement.value = originalTitle          
  editElement.className = isLongText ? 'task-edit-textarea' : 'task-edit-input'

  if (isLongText) {
    editElement.rows = Math.min(6, Math.ceil(originalTitle.length / 50))
    editElement.style.width = '100%'
  }

  span.replaceWith(editElement)
  editElement.focus()
  editElement.select()

  let isSaving = false

  const save = async () => {
    if (isSaving) return
    isSaving = true

    let newTitle = editElement.value.trim()

    if (newTitle.length > MAX_TASK_LENGTH) {
      newTitle = newTitle.substring(0, MAX_TASK_LENGTH)
      showMessage(`Название обрезано до ${MAX_TASK_LENGTH} символов`, 'info')
    }

    if (newTitle === originalTitle) {
      cancel()
      return
    }

    try {
      const response = await fetchWithAuth(`/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      })

      if (response.ok) {
        const displayTitle = newTitle.length > MAX_DISPLAY_LENGTH 
          ? newTitle.substring(0, MAX_DISPLAY_LENGTH) + '. . .' 
          : newTitle

        const newSpan = document.createElement('span')
        newSpan.className = `task-text ${span.classList.contains('completed') ? 'completed' : ''}`
        newSpan.textContent = displayTitle
        newSpan.dataset.fullTitle = newTitle
        newSpan.title = newTitle

        editElement.replaceWith(newSpan)
        showMessage('Задача обновлена', 'success')
      } else {
        cancel()
        const err = await response.json().catch(() => ({}))
        showMessage(err.error || 'Не удалось обновить задачу', 'error')
      }
    } catch (err) {
      showMessage('Ошибка соединения', 'error')
      cancel()
    }
  }

  const cancel = () => {
    const newSpan = document.createElement('span')
    newSpan.className = span.className
    newSpan.textContent = span.textContent || originalTitle
    newSpan.dataset.fullTitle = originalTitle
    newSpan.title = originalTitle
    editElement.replaceWith(newSpan)
  }

  editElement.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    } else if (e.key === 'Enter') {
      if (!isLongText) {
        e.preventDefault()
        save()
      } else if (e.ctrlKey) {
        e.preventDefault()
        save()
      }
    }
  })

  editElement.addEventListener('blur', save)
})

// обновление complite
document.getElementById('task-list').addEventListener('change', async function(e) {
  if (!e.target.classList.contains('task-checkbox')) return;
  const li = e.target.closest('li');
  const id = li.dataset.id;
  const completed = e.target.checked;
  try {
    const response = await fetchWithAuth(`/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
    });
    if (response.ok) {
      // Визуально зачёркиваем / снимаем зачёркивание
      const text = li.querySelector('.task-text');
      if (text) {
        text.classList.toggle('completed', completed);
      }
      showMessage(completed ? 'Задача выполнена!' : 'Задача отмечена как активная', 'success');
    } else {
        showMessage('Не удалось обновить статус', 'error');
        e.target.checked = !completed; // откатываем чекбокс
    }
  } catch (err) {
      showMessage('Ошибка при обновлении', 'error');
      e.target.checked = !completed;
    }
})
})
export { showMessage }