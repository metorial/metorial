export interface TaskList {
  kind?: string;
  id?: string;
  etag?: string;
  title?: string;
  updated?: string;
  selfLink?: string;
}

export interface TaskListsResponse {
  kind?: string;
  etag?: string;
  nextPageToken?: string;
  items?: TaskList[];
}

export interface TaskLink {
  type?: string;
  description?: string;
  link?: string;
}

export interface Task {
  kind?: string;
  id?: string;
  etag?: string;
  title?: string;
  updated?: string;
  selfLink?: string;
  parent?: string;
  position?: string;
  notes?: string;
  status?: string;
  due?: string;
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
  links?: TaskLink[];
  webViewLink?: string;
}

export interface TasksResponse {
  kind?: string;
  etag?: string;
  nextPageToken?: string;
  items?: Task[];
}

export interface ListTasksParams {
  maxResults?: number;
  pageToken?: string;
  showCompleted?: boolean;
  showDeleted?: boolean;
  showHidden?: boolean;
  completedMin?: string;
  completedMax?: string;
  dueMin?: string;
  dueMax?: string;
  updatedMin?: string;
}

export interface InsertTaskParams {
  parent?: string;
  previous?: string;
}

export interface MoveTaskParams {
  parent?: string;
  previous?: string;
  destinationTasklist?: string;
}
