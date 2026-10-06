import { z } from 'zod';

const id = z.string().min(1);
const optionalString = z.preprocess(
  value => (value === null ? undefined : value),
  z.string().optional()
);
const configuration = z.record(z.string(), z.unknown());
export const sourceSchema = z.object({
  sourceId: id,
  name: z.string(),
  sourceType: z.string(),
  workspaceId: id,
  configuration,
  definitionId: optionalString,
  createdAt: z.number().optional()
});
export const destinationSchema = z.object({
  destinationId: id,
  name: z.string(),
  destinationType: z.string(),
  workspaceId: id,
  configuration,
  definitionId: optionalString,
  createdAt: z.number().optional()
});
export const streamConfigurationSchema = z.object({
  name: z.string(),
  namespace: optionalString,
  syncMode: optionalString,
  cursorField: z.array(z.string()).optional(),
  primaryKey: z.array(z.array(z.string())).optional(),
  selectedFields: z.array(z.object({ fieldPath: z.array(z.string()) })).optional()
});
export const connectionSchema = z.object({
  connectionId: id,
  name: z.string(),
  sourceId: id,
  destinationId: id,
  workspaceId: id,
  status: z.string(),
  schedule: z.object({
    scheduleType: z.string(),
    cronExpression: optionalString,
    basicTiming: optionalString
  }),
  dataResidency: z
    .string()
    .nullish()
    .transform(value => value ?? ''),
  configurations: z
    .object({ streams: z.array(streamConfigurationSchema).optional() })
    .optional(),
  namespaceDefinition: optionalString,
  namespaceFormat: optionalString,
  prefix: optionalString,
  nonBreakingSchemaUpdatesBehavior: optionalString,
  createdAt: z.number().optional()
});
export const jobSchema = z.object({
  jobId: z.number().int().positive().safe(),
  status: z.string(),
  jobType: z.string(),
  startTime: z.string(),
  connectionId: id,
  lastUpdatedAt: optionalString,
  duration: optionalString,
  bytesSynced: z.number().optional(),
  rowsSynced: z.number().optional()
});
export const workspaceSchema = z.object({
  workspaceId: id,
  name: z.string(),
  dataResidency: z.string(),
  notifications: configuration.nullish()
});
export const permissionSchema = z
  .object({
    permissionId: id,
    permissionType: z.string(),
    userId: id,
    scope: optionalString,
    scopeId: optionalString,
    workspaceId: optionalString,
    organizationId: optionalString
  })
  .transform(value => ({
    ...value,
    scope:
      value.scope ??
      (value.workspaceId ? 'workspace' : value.organizationId ? 'organization' : 'none'),
    scopeId: value.scopeId ?? value.workspaceId ?? value.organizationId ?? ''
  }));
export const streamPropertiesSchema = z.object({
  streamName: z.string(),
  syncModes: z.array(z.string()),
  streamnamespace: optionalString,
  defaultCursorField: z.array(z.string()).optional(),
  sourceDefinedCursorField: z.boolean().optional(),
  sourceDefinedPrimaryKey: z.array(z.array(z.string())).optional(),
  propertyFields: z.array(z.array(z.string())).optional()
});
export const tagSchema = z.object({
  tagId: id,
  name: z.string(),
  color: z.string(),
  workspaceId: id
});
export const organizationSchema = z.object({
  organizationId: id,
  organizationName: z.string(),
  email: z.string()
});
export const definitionSchema = z.object({
  id,
  name: z.string(),
  dockerRepository: z.string(),
  dockerImageTag: z.string(),
  documentationUrl: optionalString
});
export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({ previous: optionalString, next: optionalString, data: z.array(item) });
