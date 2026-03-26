interface Task {
  id: string,
  title: string,
  completed: boolean;
  userId: string;
}

interface AddTaskBody {
  title?: string
}

interface UpdateTaskBody {
  title?: string;
  completed?: boolean; 
}

interface DeleteTaskType {
  id: string 
}

interface UpdateTaskType {
  id: string 
}

interface User {
  id: string,
  username: string,
  password: string
}
export { Task, AddTaskBody, UpdateTaskBody, DeleteTaskType, UpdateTaskType, User }