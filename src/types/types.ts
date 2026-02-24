interface Task {
  id: string,
  title: string,
  completed: boolean
}

interface AddTaskBody {
  title?: string
}

interface UpdateTaskBody {
  title?: string;
  completed: boolean; 
}

interface DeleteTaskType {
  id: string 
}

interface UpdateTaskType {
  id: string 
}

export { Task, AddTaskBody, UpdateTaskBody, DeleteTaskType, UpdateTaskType }