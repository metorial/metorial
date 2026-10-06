import { z } from './validation';
export const workspaceId = z
  .string()
  .describe('Workspace UUID. Call list_workspaces to discover accessible IDs.');
export const groupSchema = z.object({ groupId: z.string(), groupName: z.string() });
export const workspaceSchema = z.object({
  workspaceId: z.string(),
  workspaceName: z.string(),
  status: z.string(),
  role: z.string().optional(),
  groups: z.array(groupSchema).optional()
});
export const userSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  status: z.string(),
  workspaces: z.array(workspaceSchema).optional(),
  groups: z.array(groupSchema).optional()
});
export const nativeGroup = z.object({ id: z.string(), name: z.string() }).passthrough();
export const nativeWorkspace = z
  .object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    role: z.string().optional(),
    groups: z.array(nativeGroup).optional(),
    userGroups: z.array(nativeGroup).optional()
  })
  .passthrough();
export const nativeUser = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    status: z.string(),
    workspaces: z.array(nativeWorkspace).optional(),
    userGroups: z.array(nativeGroup).optional()
  })
  .passthrough();
export const nativeApp = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    versions: z.array(z.object({ id: z.string(), name: z.string() })).optional()
  })
  .passthrough();
export const appSchema = z.object({
  appId: z.string(),
  appName: z.string(),
  slug: z.string(),
  versions: z.array(z.object({ versionId: z.string(), versionName: z.string() })).optional()
});
export const mappedGroup = (g: z.infer<typeof nativeGroup>) => ({
  groupId: g.id,
  groupName: g.name
});
export const mappedWorkspace = (w: z.infer<typeof nativeWorkspace>) => ({
  workspaceId: w.id,
  workspaceName: w.name,
  status: w.status,
  role: w.role,
  groups: (w.groups ?? w.userGroups)?.map(mappedGroup)
});
export const mappedUser = (u: z.infer<typeof nativeUser>) => ({
  userId: u.id,
  name: u.name,
  email: u.email,
  status: u.status,
  workspaces: u.workspaces?.map(mappedWorkspace),
  groups: u.userGroups?.map(mappedGroup)
});
