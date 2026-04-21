import Fastify from "fastify";
import fastifyView from '@fastify/view'; // плагин, который добавляет поддержку шаблонизаторов
import fastifyStatic from '@fastify/static'; // для раздачи CSS/шрифтов/картинок
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyFormbody from '@fastify/formbody';
import fastifyJwt from "@fastify/jwt";
import pug from 'pug'; // шаблонизатор для Node.js
import path from 'path'; // модуль, который предоставляет утилиты для работы с путями к файлам и директориям
import { fileURLToPath } from 'url';
import type { Task, AddTaskBody, DeleteTaskType } from './types/types.ts'
import { registerUser, loginUser } from "./data/users.ts";
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
    httpOnly: false,
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

// Подключаем парсер для формы (для распознавания Content-Type: application/x-www-form-urlencoded)
fastify.register(fastifyFormbody);

// JWT
fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'секретный_ключ',
  sign: {
    expiresIn: '7d'
  }
})
// схема валидации
const userDataSchema = {
  type: 'object',
  required: ['username', 'password'],
  properties: {
    username: { type: 'string', minLength: 2, maxLength: 100},
    password: { type: 'string', minLength: 8, maxLength: 100, pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$'},
  },
  additionalProperties: false
}

// request — что прислал клиент
// reply — что сервер отвечает
const authPreHandler = async (request: any, reply: any) => {
  try {
  // fastify-jwt автоматически проверяет токен из заголовка Authorization: Bearer ...
    await request.jwtVerify()
    request.userId = request.user.userId
 } catch (error) {
  return reply.code(401).send({error: 'Неверный или истекший токен'})
 }
}

// ROUTERS
fastify.post("/register", { schema: { body: userDataSchema } }, async (request, reply) => {
  const { username, password } = request.body as { username: string, password: string}

  if (!username || !password) {
    return reply.code(400).send({error: "Заполните все поля"})
  }  
  try {
  await registerUser(username, password)
  return reply.code(201).send({ success: true, message: "Регистрация успешна!"})
    } catch (err: any) {
  return reply.code(400).send({ error: err.message})
  }
})

fastify.post("/login", async (request, reply) => {
  const { username, password } = request.body as { username: string, password: string}

  if (!username || !password) {
    return reply.code(400).send({error: "Заполните все поля"})
  }

  const userId = await loginUser(username, password)

  if (!userId) {
    return reply.code(401).send({ error: "Неверный логин или пароль"})
  }  
// генерация токена
  const token = await reply.jwtSign ({
    userId: userId
  })
    reply.setCookie('token', token, {
    httpOnly: false,    // Защита от XSS
    secure: false,    
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 дней
    path: '/'
  });

  return reply.send({ 
    token,
    message: "Вход выполнен успешно"})
})
fastify.get("/login", async(_, reply) => reply.view("login", { title: "Авторизация"}))
fastify.get("/register", async(_, reply) => reply.view("register", { title: "Регистрация"}))

fastify.get("/", async(request, reply) => {
   const token = request.cookies?.token || null

  return reply.view("index", {
    title: "Список задач",
    token: token,
    message: null,
    messageType: "info"
  })
})

// TASKS
fastify.get("/tasks", { preHandler: authPreHandler }, async (request, reply) => {
  const userId = (request as any).userId
  const tasks = await getTasksByUser(userId)
  return reply.send(tasks)
});

fastify.post('/tasks', { preHandler: authPreHandler }, async(request, reply) => {
  const body = request.body as AddTaskBody
  const userId = (request as any).userId

  if (!body?.title?.trim()) return reply.code(400).send({ error: "Название обязательно"})

  const newTask = await addTask(body.title.trim(), userId)
  return reply.code(201).send( { success: true, task: newTask })
})

fastify.put('/tasks/:id', { preHandler: authPreHandler }, async(request, reply) => {
  const { id } = request.params as { id: string}
  const userId = (request as any).userId
  const updates = request.body as Partial<Task>

  const updated = await updateTask(Number(id), updates, userId)
  if (!updated) return reply.code(404).send({ error: "Задача не найдена или нет доступа"})
  return reply.send(updated)
 })

fastify.delete('/tasks/:id', { preHandler: authPreHandler }, async(request, reply) => {
  const { id } = request.params as DeleteTaskType
  const userId = (request as any).userId

  const deleted = await deleteTaskById(Number(id), userId)

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
// обработчик ошибок, которе возникают во время обработки запроса
// метод, который замняет стандартный обработчк Fastify на кастомный
fastify.setErrorHandler((error: unknown, request, reply) => {
  if (error instanceof Error && 'validation' in error && Array.isArray((error as any).validation)) {
    const validationError = error as {validation: any[]}
  
  let messageError = '';

    validationError.validation.forEach((err: any) => {
      const field = err.instancePath ? err.instancePath.slice(1) : (err.params?.missingProperty || '')

      if (field === 'username') {
        if (err.keyword === 'required') {
          messageError += 'Имя пользователя — обязательное поле.\n';
        } else if (err.keyword === 'minLength') {
          messageError += 'Имя пользователя должно содержать минимум 2 символа.\n';
        }
      }
      if (field === 'password') {
        if (err.keyword === 'required') {
          messageError += 'Пароль — обязательное поле.\n';
        } else if (err.keyword === 'minLength') {
          messageError += 'Пароль должен содержать минимум 8 символов.\n';
        } else if (err.keyword === 'pattern') {
          messageError += 'Пароль должен содержать заглавные и строчные буквы, а также хотя бы одну цифру.\n';
        }
      }
    });
    // Если нет конкретных сообщений — общее
    if (!messageError) {
      messageError = 'Проверьте введённые данные и попробуйте снова.';
    }
// рендер шаблона с ошибкой
    return reply.view('register', {
      title: 'Регистрация пользователя',
      error: messageError.trim(),
      username: (request.body as any)?.username || '',
      password: (request.body as any)?.password|| '',
      success: null,
    });
  }

  // Другие ошибки
  fastify.log.error(error);
  return reply.status(500).view('add-car', {
    title: 'Добавить автомобиль',
    error: 'Внутренняя ошибка сервера. Попробуйте позже.',
    username: '',
    password: '',
    success: null,
  });
});

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