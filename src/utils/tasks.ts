export interface Task {
  id: number;
  title: string;
  description?: string;
  reservationId?: number;
  assignedTo?: string;
  status: 'open' | 'in-progress' | 'done';
  createdAt: string;
}

const STORAGE_KEY = 'tasks_v1';

export function getTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Task[];
  } catch (e) {
    console.error('Failed to read tasks from storage', e);
    return [];
  }
}

export function saveTasks(list: Task[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save tasks', e);
  }
}

export function addTask(input: Omit<Task, 'id' | 'createdAt'>): Task {
  const list = getTasks();
  const id = list.length > 0 ? Math.max(...list.map(t => t.id)) + 1 : 1;
  const newTask: Task = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
  } as Task;
  list.unshift(newTask);
  saveTasks(list);
  return newTask;
}

export function deleteTask(id: number) {
  try {
    const list = getTasks();
    const filtered = list.filter(t => t.id !== id);
    saveTasks(filtered);
    return true;
  } catch (e) {
    console.error('Failed to delete task', e);
    return false;
  }
}
