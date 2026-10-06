import { z } from 'zod';
import { field, idNumber, malformed, object, records } from './validation';

const text = (r: Record<string, unknown>, key: string) => field(r, key, z.string().optional());
const nullableText = (r: Record<string, unknown>, key: string) =>
  field(r, key, z.string().nullable().optional());
const count = (r: Record<string, unknown>, key: string) =>
  field(r, key, z.number().int().nonnegative().optional());
const bool = (r: Record<string, unknown>, key: string) =>
  field(r, key, z.boolean().optional());
const identifier = (r: Record<string, unknown>, key: string): number | null | undefined => {
  const value = r[key];
  if (value === undefined || value === null) return value;
  return idNumber(value);
};
export const recipe = (r: Record<string, unknown>) => ({
  recipeId: idNumber(r.id),
  name: field(r, 'name', z.string()),
  description: nullableText(r, 'description'),
  running: bool(r, 'running'),
  triggerApplication: nullableText(r, 'trigger_application'),
  actionApplications: field(r, 'action_applications', z.array(z.string()).optional()),
  folderId: identifier(r, 'folder_id'),
  projectId: identifier(r, 'project_id'),
  jobSucceededCount: count(r, 'job_succeeded_count'),
  jobFailedCount: count(r, 'job_failed_count'),
  lastRunAt: nullableText(r, 'last_run_at'),
  createdAt: text(r, 'created_at'),
  updatedAt: text(r, 'updated_at')
});
export const recipeDetails = (r: Record<string, unknown>) => ({
  ...recipe(r),
  stoppedAt: nullableText(r, 'stopped_at'),
  stopCause: nullableText(r, 'stop_cause'),
  versionNo: count(r, 'version_no'),
  code: nullableText(r, 'code')
});
export const connection = (r: Record<string, unknown>) => ({
  connectionId: idNumber(r.id),
  name: field(r, 'name', z.string()),
  application: field(r, 'application', z.string()),
  authorizationStatus: nullableText(r, 'authorization_status'),
  authorizationError: nullableText(r, 'authorization_error'),
  folderId: identifier(r, 'folder_id'),
  projectId: identifier(r, 'project_id'),
  createdAt: text(r, 'created_at'),
  updatedAt: text(r, 'updated_at')
});
export const version = (r: Record<string, unknown>) => ({
  versionId: idNumber(r.id),
  versionNo: idNumber(r.version_no),
  comment: nullableText(r, 'comment'),
  authorName: nullableText(r, 'author_name'),
  authorEmail: nullableText(r, 'author_email'),
  createdAt: text(r, 'created_at')
});
export const project = (r: Record<string, unknown>) => ({
  projectId: idNumber(r.id),
  name: field(r, 'name', z.string()),
  description: nullableText(r, 'description'),
  folderId: identifier(r, 'folder_id')
});
export const folder = (r: Record<string, unknown>) => ({
  folderId: idNumber(r.id),
  name: field(r, 'name', z.string()),
  parentId: identifier(r, 'parent_id'),
  projectId: identifier(r, 'project_id'),
  isProject: bool(r, 'is_project')
});
export const topic = (r: Record<string, unknown>) => ({
  topicId: idNumber(r.id),
  name: field(r, 'name', z.string()),
  description: nullableText(r, 'description'),
  retention: field(r, 'retention', z.number().int().nonnegative().nullable().optional()),
  folderId: identifier(r, 'folder_id'),
  createdAt: text(r, 'created_at')
});
export const deployment = (r: Record<string, unknown>) => ({
  deploymentId: idNumber(r.id),
  projectId:
    r.project_id === null || r.project_id === undefined
      ? r.project_id
      : String(idNumber(r.project_id)),
  environmentType: field(r, 'environment_type', z.string()),
  state: field(r, 'state', z.string()),
  title: nullableText(r, 'title'),
  description: nullableText(r, 'description'),
  performedByName: nullableText(r, 'performed_by_name'),
  createdAt: text(r, 'created_at'),
  updatedAt: text(r, 'updated_at')
});
export const job = (r: Record<string, unknown>) => ({
  jobId: field(r, 'id', z.string().min(1)),
  recipeId: idNumber(r.recipe_id),
  status: field(r, 'status', z.string()),
  isError: bool(r, 'is_error'),
  startedAt: nullableText(r, 'started_at'),
  completedAt: nullableText(r, 'completed_at')
});
export const workspace = (r: Record<string, unknown>) => ({
  workspaceId: idNumber(r.id),
  name: text(r, 'name'),
  email: nullableText(r, 'email'),
  planId: nullableText(r, 'plan_id'),
  recipesCount: count(r, 'recipes_count'),
  activeRecipesCount: count(r, 'active_recipes_count'),
  rootFolderId: identifier(r, 'root_folder_id'),
  companyName: nullableText(r, 'company_name'),
  teamName: text(r, 'team_name'),
  environmentName: text(r, 'environment_name'),
  createdAt: text(r, 'created_at')
});
export const queryRecords = (result: Record<string, unknown>) => {
  if (
    !Array.isArray(result.schema) ||
    result.schema.length !== 2 ||
    !Array.isArray(result.data)
  )
    return malformed();
  const headers = result.schema.map(group =>
    records(group).map(column => field(column, 'name', z.string()))
  );
  if (headers.some(group => new Set(group).size !== group.length)) return malformed();
  return result.data.map(entry => {
    if (!Array.isArray(entry) || entry.length !== 2) return malformed();
    const values = entry.map((group, index) => {
      const keys = headers[index];
      if (!Array.isArray(group) || !keys || group.length !== keys.length) return malformed();
      return Object.fromEntries(keys.map((key, offset) => [key, group[offset]]));
    });
    return { metadata: object(values[0]), fields: object(values[1]) };
  });
};
