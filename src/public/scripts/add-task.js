document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('task-form')
  if (!form) return

  const input = form.querySelector('input[name="title"]')

  form.addEventListener('submit', async(event) => {
    event.preventDefault()

    const title = input.value.trim()
    if (!title) return
    try {
      const response = await fetch ('/tasks', {
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
      const newTask = data.task || data

      const li = document.createElement('li')
      li.className = 'task-item'
      li.innerHTML = `
      <div class="task-content">
        <span class="task-text">${newTask.title}</span>
      </div>
      <input type="checkbox" class="task-checkbox" ${newTask.completed ? 'checked' : ''}> 
      <a class="delete-link" 
          href="#" 
          title="Удалить задачу"
          data-id="${newTask.id}"
          data-title="${newTask.title}"
        >
          <img class="delete-icon"
              src="/public/images/trash-bin-trash-svgrepo-com.svg"
              alt="Удалить"
              width="24"
              height="24">
  </a>
      `
      document.getElementById('task-list').append(li);
      showMessage(`Задача успешно добавлена: ${newTask.title}`, 'success')
    } catch(err) {
      showMessage(err.message || 'Не удалось добавить задачу', 'error')
    }
  })

  function showMessage(text, type = 'info') {
    const messageDiv = document.createElement('div')
    messageDiv.className = `message message-${type}`
    messageDiv.innerHTML = `
      ${text}
      <button class="message-close" onclick="this.parentElement.remove()">×</button>
    `
    document.body.insertBefore(messageDiv, document.body.firstChild)
  }

  document.getElementById('task-list').addEventListener('click', async function(event) {
    const link = event.target.closest('.delete-link')
    if (!link) return

    event.preventDefault()

    const id = link.getAttribute('data-id')
     if (!id) return

    const title = link.getAttribute('data-title') || 'задача'
   

    if (!confirm(`Вы уверены, что хотите удалить задачу "${title}"?`)) return

    try {
      const response = await fetch (`/tasks/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        link.closest('li').remove()
        showMessage(`Задача успешно удалена: ${title}`, 'success')
      } else {
        const errData = await response.json().catch(() => ({}))
        showMessage(errData.error || `Не удалось удалить задачу: ${title}`, 'error')
      }
    } catch(error) {
      showMessage(`Ошибка при удалении задачи: ${title}`, 'error');
    }
  })

  document.getElementById('task-list').addEventListener('dblclick', function(event) {
    const span = event.target.closest('.task-text')
    if (!span || span.classList.contains('editing')) return

    const li = span.closest('li')
    if (!li) return

    const id = li.dataset.id
    if (!id) return

    const originalTitle = span.dataset.title || span.textContent.trim()

    const input = document.createElement('input')
    input.type = 'text'
    input.value = originalTitle
    input.className = 'task-edit-input'
    // input.setAttribute('data-original', originalTitle)

    // Заменяем span на input
    span.replaceWith(input)
    input.focus()
    input.select()

    // span.classList.add('editing');
    // Флагируем, что идёт редактирование
    input.dataset.editing = 'true'
    let isSaving = false

    const save = async () => {
      if (isSaving) return
      isSaving = true
      const newTitle = input.value.trim();

      if (newTitle === originalTitle) {
        cancel();
        return;
    }

      // if (!newTitle) {
      //   showMessage('Название задачи не может быть пустым', 'error');
      //   cancelEdit();
      //   return;
      // }

      try {
        const response = await fetch(`/tasks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        })

        if (response.ok) {
          // Успех → заменяем input обратно на span
          const newSpan = document.createElement('span');
          newSpan.className = 'task-text';
          newSpan.textContent = newTitle;
          newSpan.dataset.title = newTitle;
          input.replaceWith(newSpan);
          showMessage('Название задачи обновлено', 'success');
        } else {
          const err = await response.json().catch(() => ({}));
          showMessage(err.error || 'Не удалось обновить задачу', 'error')
          cancel();
        }
      } catch (err) {
        showMessage('Ошибка соединения', 'error')
        cancel();
      }
    }
    // Отмена при Esc
    const cancel = () => {
      const newSpan = document.createElement('span');
      newSpan.className = 'task-text';
      newSpan.textContent = originalTitle;
      newSpan.dataset.title = originalTitle;
      input.replaceWith(newSpan);
    }

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        save();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    })
// Потеря фокуса = сохранить (или можно отменить — как удобнее)
    input.addEventListener('blur', () => {
       save(); // или cancelEdit() — решай сама
    })
  })

  document.getElementById('task-list').addEventListener('change', async function(e) {
    if (!e.target.classList.contains('task-checkbox')) return;

    const li = e.target.closest('li');
    const id = li.dataset.id;
    const completed = e.target.checked;

    try {
      const response = await fetch(`/tasks/${id}`, {
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