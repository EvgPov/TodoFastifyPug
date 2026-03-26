import type { User } from "../types/types.ts";
import {v4 as uuidv4} from 'uuid';
import bcrypt from "bcrypt";

let users: User[] = []

const toketStore = new Map<string, string>()

async function registerUser(username: string, password: string){
  if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("Пользователь с таким именем уже существует");
  }
  const hashedPassword = await bcrypt.hash(password, 10)
  const newUser: User = {
    id: uuidv4(),
    username,
    password: hashedPassword
  }
  users.push(newUser);
  return newUser
}

async function loginUser(username: string, password: string): Promise<string | null> {
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase())
  if (!user) return null
  const match = await bcrypt.compare(password, user.password)
  if (!match) return null
  const token = uuidv4()
  toketStore.set(token, user.id)
  return token
}

function getUserIdByToken(token: string): string | undefined {
  return toketStore.get(token)
}

export { registerUser, loginUser, getUserIdByToken }