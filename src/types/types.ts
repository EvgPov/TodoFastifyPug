interface Task {
  id: number,
  title: string,
  completed: boolean;
  user_id: number;
  created_at?: string
}

interface AddTaskBody {
  title?: string
}

// interface UpdateTaskBody {
//   title?: string;
//   completed?: boolean; 
// }

interface DeleteTaskType {
  id: string 
}

// interface UpdateTaskType {
//   id: string 
// }

// interface User {
//   id: number,
//   username: string,
//   password: string
// }
export { Task, AddTaskBody, DeleteTaskType }