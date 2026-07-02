import { anyOf } from 'slates';

export let googleTasksScopes = {
  tasks: 'https://www.googleapis.com/auth/tasks',
  tasksReadonly: 'https://www.googleapis.com/auth/tasks.readonly',
  userinfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userinfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

let tasksRead = anyOf(googleTasksScopes.tasks, googleTasksScopes.tasksReadonly);

let tasksWrite = anyOf(googleTasksScopes.tasks);

export let googleTasksActionScopes = {
  listTaskLists: tasksRead,
  createTaskList: tasksWrite,
  updateTaskList: tasksWrite,
  deleteTaskList: tasksWrite,
  listTasks: tasksRead,
  getTask: tasksRead,
  createTask: tasksWrite,
  updateTask: tasksWrite,
  moveTask: tasksWrite,
  deleteTask: tasksWrite,
  clearCompletedTasks: tasksWrite,
  taskChanges: tasksRead,
  inboundWebhook: tasksRead
} as const;
