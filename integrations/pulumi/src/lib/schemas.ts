import { z } from 'zod';

export const organizationInput = z
  .string()
  .optional()
  .describe(
    'Pulumi organization login. Call get_current_user to discover memberships; uses the configured default when omitted.'
  );
export const userInfo = z.object({
  name: z.string(),
  githubLogin: z.string(),
  avatarUrl: z.string(),
  email: z.string().nullish()
});
export const organizationResponse = z.object({
  name: z.string(),
  githubLogin: z.string(),
  avatarUrl: z.string().optional(),
  role: z.string().optional()
});
export const userResponse = z.object({
  id: z.string().min(1),
  githubLogin: z.string().min(1),
  name: z.string(),
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  organizations: z.array(organizationResponse),
  tokenInfo: z
    .object({ name: z.string(), organization: z.string(), team: z.string() })
    .optional()
});
export const stackSummaryResponse = z.object({
  orgName: z.string(),
  projectName: z.string(),
  stackName: z.string(),
  lastUpdate: z.number().optional(),
  resourceCount: z.number().optional()
});
export const stackResponse = stackSummaryResponse.extend({
  id: z.string().optional(),
  version: z.number(),
  activeUpdate: z.string().optional(),
  tags: z.record(z.string(), z.string()).optional(),
  currentOperation: z
    .object({ kind: z.string(), author: z.string(), started: z.number() })
    .nullish()
});
export const deploymentResponse = z.object({
  id: z.string().min(1),
  version: z.number(),
  status: z.string(),
  created: z.string(),
  modified: z.string().optional(),
  pulumiOperation: z.string().optional(),
  operation: z.string().optional(),
  projectName: z.string().optional(),
  stackName: z.string().optional(),
  requestedBy: userInfo.optional()
});
export const environmentResponse = z.object({
  id: z.string().min(1),
  organization: z.string(),
  project: z.string().optional(),
  name: z.string(),
  created: z.string(),
  modified: z.string()
});
export const updateResponse = z.object({
  version: z.number(),
  kind: z.string(),
  result: z.string(),
  message: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  resourceChanges: z.record(z.string(), z.number()).optional(),
  resourceCount: z.number().optional()
});
export const memberResponse = z.object({
  user: userInfo,
  role: z.string(),
  knownToPulumi: z.boolean(),
  fgaRole: z.object({ id: z.string(), name: z.string() }).passthrough().optional()
});
export const accessTokenResponse = z.object({
  id: z.string().min(1),
  description: z.string(),
  lastUsed: z.number(),
  name: z.string().optional(),
  created: z.string().optional(),
  expires: z.number().optional(),
  type: z.string().optional()
});
export const auditEventResponse = z.object({
  timestamp: z.number(),
  sourceIP: z.string(),
  event: z.string(),
  description: z.string(),
  user: userInfo
});
export const policyPackResponse = z.object({
  name: z.string(),
  displayName: z.string(),
  versions: z.array(z.number()),
  versionTags: z.array(z.string())
});
export const webhookResponse = z.object({
  name: z.string().min(1),
  displayName: z.string(),
  organizationName: z.string(),
  projectName: z.string().optional(),
  stackName: z.string().optional(),
  payloadUrl: z.string(),
  active: z.boolean(),
  format: z.string().optional(),
  filters: z.array(z.string()).optional(),
  groups: z.array(z.string()).optional(),
  hasSecret: z.boolean().optional()
});
