// SafetyCulture documents these built-in identifiers for action and issue filters and updates.
let priorities: Record<string, string> = {
  none: '58941717-817f-4c7c-a6f6-5cd05e2bbfde',
  low: '16ba4717-adc9-4d48-bf7c-044cfe0d2727',
  medium: 'ce87c58a-eeb2-4fde-9dc4-c6e85f1f4055',
  high: '02eb40c1-4f46-40c5-be16-d32941c96ec9'
};
let actionStatuses: Record<string, string> = {
  'to do': '17e793a1-26a3-4ecd-99ca-f38ecc6eaa2e',
  'in progress': '20ce0cb1-387a-47d4-8c34-bc6fd3be0e27',
  complete: '7223d809-553e-4714-a038-62dc98f3fbf3',
  done: '7223d809-553e-4714-a038-62dc98f3fbf3',
  "can't do": '06308884-41c2-4ee0-9da7-5676647d3d75'
};
let issueStatuses: Record<string, string> = {
  open: '547ed646-5e34-4732-bb54-a199d304368a',
  resolved: '450484b1-56cd-4784-9b49-a3cf97d0c0ad'
};
let normalize = (value: string) => value.trim().toLowerCase().replaceAll('_', ' ');
export let priorityId = (value: string) => priorities[normalize(value)] ?? value;
export let actionStatusId = (value: string) => actionStatuses[normalize(value)] ?? value;
export let issueStatusId = (value: string) => issueStatuses[normalize(value)] ?? value;
export let userCollaborators = (ids: string[]) =>
  ids.map(collaborator_id => ({
    collaborator_id,
    collaborator_type: 'USER',
    assigned_role: 'ASSIGNEE'
  }));
export let taskState = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    let state = value as Record<string, unknown>;
    for (let key of ['key', 'status_id', 'id', 'label'])
      if (typeof state[key] === 'string') return state[key];
  }
  return undefined;
};
