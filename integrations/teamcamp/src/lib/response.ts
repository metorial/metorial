import { createApiServiceError, isApiErrorRecord } from 'slates';

export type ProviderRecord = Record<string, unknown>;

export let invalidResponse = (detail: string) =>
  createApiServiceError(
    `Teamcamp returned an unexpected response: ${detail}. If this followed a write, check the resource before retrying because the operation may have completed.`,
    { reason: 'teamcamp_invalid_response' }
  );

export let requireRecord = (value: unknown): ProviderRecord => {
  if (!isApiErrorRecord(value)) throw invalidResponse('expected an object');
  return value;
};

export let requireRecords = (value: unknown, allowSingleton = false): ProviderRecord[] => {
  // The company list documentation shows a single object; retain array support
  // for the existing workspace-list contract without turning malformed data into [].
  let items = allowSingleton && isApiErrorRecord(value) ? [value] : value;
  if (!Array.isArray(items)) throw invalidResponse('expected a list');
  return items.map(requireRecord);
};

export let requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') throw invalidResponse(`missing or invalid ${field}`);
  return value;
};

export let requiredBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== 'boolean') throw invalidResponse(`missing or invalid ${field}`);
  return value;
};

export let optionalString = (value: unknown) =>
  typeof value === 'string' ? value : undefined;
export let optionalNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
export let optionalBoolean = (value: unknown) =>
  typeof value === 'boolean' ? value : undefined;
export let optionalStrings = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every(item => typeof item === 'string') ? value : undefined;

let optionalTaskUsers = (value: unknown) => {
  if (
    !Array.isArray(value) ||
    !value.every(item => isApiErrorRecord(item) && typeof item.taskUserId === 'string')
  )
    return undefined;
  return value.map(item => ({ taskUserId: requiredString(item.taskUserId, 'taskUserId') }));
};

export let mapProject = (value: unknown) => {
  let project = requireRecord(value);
  return {
    projectId: requiredString(project.projectId, 'projectId'),
    projectName: requiredString(project.projectName, 'projectName'),
    workspaceId: optionalString(project.workspaceId),
    ownerId: optionalString(project.ownerId),
    description: optionalString(project.description),
    customerId: optionalString(project.customerId),
    startDate: optionalString(project.startDate),
    dueDate: optionalString(project.dueDate),
    favoriteUsers: optionalStrings(project.favoriteUsers),
    projectUsers: optionalStrings(project.projectUsers),
    raw: value
  };
};

export let mapGroup = (value: unknown) => {
  let group = requireRecord(value);
  return {
    groupId: requiredString(group.groupId, 'groupId'),
    groupName: requiredString(group.groupName, 'groupName')
  };
};

export let mapTask = (value: unknown) => {
  let task = requireRecord(value);
  return {
    taskId: requiredString(task.taskId, 'taskId'),
    taskName: requiredString(task.taskName, 'taskName'),
    projectId: optionalString(task.projectId),
    groupId: optionalString(task.groupId),
    group: optionalString(task.group),
    description: optionalString(task.description),
    status: optionalBoolean(task.status),
    // The public API documents a string priority. Keep the existing numeric
    // summary only for actual numbers and retain other values in raw.
    priority: optionalNumber(task.priority),
    dueDate: optionalString(task.dueDate),
    estimateTime: optionalNumber(task.estimateTime),
    milestoneId:
      typeof task.milestoneId === 'string'
        ? task.milestoneId
        : typeof task.milestoneId === 'number' && Number.isFinite(task.milestoneId)
          ? String(task.milestoneId)
          : undefined,
    subscribers: optionalStrings(task.subscribers),
    taskUsers: optionalTaskUsers(task.taskUsers),
    raw: value
  };
};

export let mapUpdatedTask = (value: unknown) => {
  let task = requireRecord(value);
  return {
    taskId: requiredString(task._id ?? task.taskId, 'task ID'),
    taskName: requiredString(task.Name ?? task.taskName, 'task name'),
    projectId: optionalString(task.ProjectId ?? task.projectId),
    groupId: optionalString(task.GroupId ?? task.groupId),
    description: optionalString(task.Desc ?? task.description),
    status: optionalBoolean(task.Status ?? task.status),
    priority: optionalNumber(task.Priority ?? task.priority),
    dueDate: optionalString(task.DueDate ?? task.dueDate),
    raw: value
  };
};
