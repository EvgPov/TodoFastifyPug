import Fastify from "fastify";
import fastifyView from '@fastify/view'; // плагин, который добавляет поддержку шаблонизаторов
import fastifyStatic from '@fastify/static'; // для раздачи CSS/шрифтов/картинок
import pug, { compile } from 'pug'; // шаблонизатор для Node.js
import path from 'path'; // модуль, который предоставляет утилиты для работы с путями к файлам и директориям
import { fileURLToPath } from 'url';

import type { Task, AddTaskBody, DeleteTaskType, UpdateTaskType } from './types/types.ts'
import {tasks, initTasks, addTask, deleteTaskById, updateTask } from './tasks.ts'


// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initTasks();   // инициализация задач

const fastify = Fastify({ logger: true });

// Register the @fastify/view plugin
fastify.register(fastifyView, {
  engine: {
    pug: pug,
  }, 
  root: path.join(__dirname, 'views'), // Specify the directory where templates are located
  propertyName: 'view', // The method name added to the reply object (default is 'view')
  viewExt: 'pug', // The file extension for your templates
});

// Раздача статических файлов (css, js, img и т.д.)
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',           
});

//  request —что прислал клиент
//  reply — что сервер отвечает

// Главная страница - список задач
fastify.get('/', async(request, reply) => {
  // Use reply.view() to render the template and pass data
  // request.params параметры из URL
  const { message, type } = request.query as { message?: string, type?: string };
  // рендерит views/index.pug и передает данные (tasks, message)
  // decodeURIComponent - преобразует закодированную строку обратно в её исходный вид
  return reply.view('index', {
    title: 'Список задач',
    tasks: tasks,
    message: message ? decodeURIComponent(message) : null,
    messageType: type || 'info',
  })
});

// Добавление задачи
// encodeURIComponent - преобразует специальные символы в безопасный формат
fastify.get('/add', async(request, reply) => {
// извлекаем task (query-параметр) из URL (строка)
  const { task } = request.query as {task?: string}
  let message = null
  let redirectUrl = '/'; // базовый URL для редиректа

// если task - строка и  существует
  if (task && typeof task === 'string' && task.trim() !== '') {
    const trimmedTask = task.trim()
    addTask(trimmedTask)

     message = {
      type: 'success',
      text: `Задача "${trimmedTask}" успешно добавлена`
    }
  } else {
     message = {
      type: 'error',
      text: 'Не удалось добавить задачу: задача не может быть пустой'
    }
  }
  if (message) {
    redirectUrl = `/?message=${encodeURIComponent(message.text)}&type=${message.type}`;
  }
   // Перенаправляем на главную и передаём сообщение через query
    return reply.redirect(redirectUrl);
})

// Получить все задачи (GET REST)
fastify.get('/tasks', async (request, reply) => {
  // Просто возвращаем текущий массив tasks
  return reply
    .code(200)
    .send(tasks);
});

// Добавление задачи (POST REST)
fastify.post('/tasks', async(request, reply) => {
  const body = request.body as AddTaskBody

  if (!body?.title || typeof body.title !== 'string') {
    return reply
      .code(400)
      .send({ error: 'Поле title обязательно и не может быть пустым'})
  }

  const trimmed = body.title.trim();
  if (!trimmed) {
    return reply
      .code(400)
      .send({ error: 'Название задачи не может быть пустым' });
  }

  try {
    const newTask = addTask(trimmed)
    return reply
      .code(201)
      .header('Location', `/tasks/${newTask.id}`)
      .send({
        success: true,
        task: newTask,
        message: `Задача "${newTask.title}" успешно добавлена`})
  } catch (err) {
    fastify.log.error(err);
    return reply
      .code(500)
      .send({error: 'Внутренняя ошибка сервера'})
  }
})
// обновление задачи по id (PUT REST)
fastify.put('/tasks/:id', async(request, reply) => {
  const { id  } = request.params as UpdateTaskType
  
  const updates = request.body as Partial<Task>

  if (!updates || (updates.title === undefined && updates.completed === undefined)) {
    return reply
      .code(400)
      .send({ error: 'Необходимо передать хотя бы одно поле: title или completed' })
  }

  if (updates.title !== undefined) {
    const trimmed = String(updates.title).trim()
    if (!trimmed) {
      return reply
      .code(400)
      .send({ error: 'Поле title не может быть пустым' })
    }
    updates.title = trimmed
  }

  try {
    const updatedTask = updateTask(id, updates)

    if (!updatedTask) {
        return reply
          .code(404)
          .send({ error: 'Задача не найдена' })
      }

    return reply
      .code(200)
      .send(updatedTask)
  } catch(err) {
    fastify.log.error(err)
      return reply
        .code(500)
        .send({ error: 'Внутренняя ошибка сервера' })
  }
})

// Удаление задачи по id (DELETE REST)
fastify.delete('/tasks/:id', async(request, reply) => {
  const { id } = request.params as DeleteTaskType

  const deleted = deleteTaskById(id)

  if (!deleted) {
    return reply
      .code(404)
      .send({ error: 'Задача не найдена' })
  }
// 204 No Content - рекомендуемый ответ успешного DELETE, если сервер не возвращает тело
  return reply
    .code(204)
    .send()
})

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Server listening on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();