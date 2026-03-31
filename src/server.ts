import Fastify from "fastify";
import fastifyView from '@fastify/view'; // плагин, который добавляет поддержку шаблонизаторов
import fastifyStatic from '@fastify/static'; // для раздачи CSS/шрифтов/картинок
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import pug from 'pug'; // шаблонизатор для Node.js
import path from 'path'; // модуль, который предоставляет утилиты для работы с путями к файлам и директориям
import { fileURLToPath } from 'url';
import type { Task, AddTaskBody, DeleteTaskType } from './types/types.ts'
import { registerUser, loginUser, getUserIdByToken } from "./data/users.ts";
import { addTask, getTasksByUser, deleteTaskById, updateTask } from './data/tasks.ts'
// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fastify = Fastify({ logger: true });

// Регистрируем CORS
fastify.register(fastifyCors, {
  origin: true,
  credentials: true
});

// Регистрируем cookie плагин
fastify.register(fastifyCookie, {
  secret: "your-secret-key-change-this-in-production", // для подписи cookies
  parseOptions: {
    httpOnly: true,
    secure: false, // для разработки
    sameSite: 'lax',
    path: '/'
  }
});

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
// request —что прислал клиент
// reply — что сервер отвечает
const authPreHandler = async (request: any, reply: any) => {
  let token: string | null = null;

  // Сначала проверяем Authorization header (из localStorage)
  const auth = request.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    token = auth.slice(7);
  }

  // Если нет в header, проверяем cookies
  if (!token && request.cookies && request.cookies.token) {
    token = request.cookies.token;
  }

  if (!token) {
    return reply.code(401).send({ error: "Токен обязателен" });
  }

  const userId = getUserIdByToken(token)
  if (!userId) {
    return reply.code(401).send({error: "Неверный токен"})
  }
    request.userId = userId
    request.token = token;
}
fastify.post("/register", async (request, reply) => {
  const { username, password } = request.body as { username: string, password: string}
  if (!username || !password) return reply.code(400).send({error: "Заполните все поля"})
  try {
  await registerUser(username, password)
  return reply.code(201).send({ seccess: true, message: "Регистрация успешна!"})
    } catch (err: any) {
  return reply.code(400).send({ error: err.message})
  }
})
fastify.post("/login", async (request, reply) => {
  const { username, password } = request.body as { username: string, password: string}
  if (!username || !password) return reply.code(400).send({error: "Заполните все поля"})
  const token = await loginUser(username, password)
  if (!token) return reply.code(401).send({ error: "Неверный логин или пароль"})

    reply.setCookie('token', token, {
    httpOnly: true,    // Защита от XSS
    secure: false,    
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 дней
    path: '/'
  });

  return reply.send({ 
    token,
    userId: getUserIdByToken(token),
    message: "Вход выполнен"})
})
fastify.get("/login", async(_, reply) => reply.view("login", { title: "Авторизация"}))
fastify.get("/register", async(_, reply) => reply.view("register", { title: "Регистрация"}))
fastify.get("/", async(request, reply) => {
 
  let token: string | null = null
  // Проверяем query-параметр (после редиректа из логина)
  if (typeof request.query === 'object' && request.query !== null) {
    const q = request.query as Record<string, string>;
    if (q.token) {
      token = q.token;
    }
  }
  // Если токена нет в query — проверяем заголовок
  if (!token && request.headers.authorization?.startsWith("Bearer ")) {
    token = request.headers.authorization.slice(7);
  }
  return reply.view("index", {
    title: "Список задач",
    tasks: [],
    token: token,
    message: null,
    messageType: "info"
  })
})
fastify.get("/tasks", { preHandler: authPreHandler }, async (request, reply) => {
  const userId = (request as any).userId
  return reply.send(getTasksByUser(userId))
});
fastify.post('/tasks', { preHandler: authPreHandler }, async(request, reply) => {
  const body = request.body as AddTaskBody
  const userId = (request as any).userId
  if (!body?.title?.trim()) return reply.code(400).send({ error: "Название обязательно"})
  const newTask = addTask(body.title.trim(), userId)
  return reply.code(201).send( { seccess: true, task: newTask })
})
fastify.put('/tasks/:id', { preHandler: authPreHandler }, async(request, reply) => {
  const { id } = request.params as { id: string}
  const userId = (request as any).userId
  const updates = request.body as Partial<Task>
  const updated = updateTask(id, updates, userId)
  if (!updated) return reply.code(404).send({ error: "Задача не найдена или нет доступа"})
  return reply.send(updated)
 })
fastify.delete('/tasks/:id', { preHandler: authPreHandler }, async(request, reply) => {
  const { id } = request.params as DeleteTaskType
  const userId = (request as any).userId
  if (!userId) {
    return reply.code(401).send({ error: 'Пользователь не авторизован'})
  }
  const deleted = deleteTaskById(id, userId)
  if (!deleted) {
    return reply
      .code(404)
      .send({ error: 'Задача не найдена или нет доступа' })
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
      console.log('Server listening on http://localhost:3000/login');
  } catch (err) {
      fastify.log.error(err);
      process.exit(1);
  }
};
start();