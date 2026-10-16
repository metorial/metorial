import { createApiServiceError, isApiErrorRecord, pickDefined } from 'slates';
import { z } from 'zod';

export type ApiObject = Record<string, unknown>;
export let rawSchema = z
  .record(z.string(), z.unknown())
  .describe('Complete provider response data');

export let responseError = (field: string): never => {
  throw createApiServiceError(
    `Browse AI returned an invalid or missing ${field}. Retry the request or check the robot in your dashboard.`,
    {
      reason: 'invalid_provider_response'
    }
  );
};

export let object = (value: unknown, field: string): ApiObject =>
  isApiErrorRecord(value) ? value : responseError(field);
export let objects = (value: unknown, field: string): ApiObject[] =>
  Array.isArray(value) ? value.map(item => object(item, field)) : responseError(field);
export let text = (value: unknown, field: string): string =>
  typeof value === 'string' && value.length > 0 ? value : responseError(field);
export let numeric = (value: unknown, field: string): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : responseError(field);
export let flag = (value: unknown, field: string): boolean =>
  typeof value === 'boolean' ? value : responseError(field);
export let optionalText = (value: unknown, field: string): string | undefined =>
  value == null ? undefined : typeof value === 'string' ? value : responseError(field);
export let optionalNumber = (value: unknown, field: string): number | undefined =>
  value == null ? undefined : numeric(value, field);
export let optionalFlag = (value: unknown, field: string): boolean | undefined =>
  value == null ? undefined : flag(value, field);
export let optionalObject = (value: unknown, field: string): ApiObject | undefined =>
  value == null ? undefined : object(value, field);

export let robotParameterSchema = z.object({
  name: z.string().describe('Parameter name'),
  type: z.string().optional().describe('Parameter type when supplied by Browse AI'),
  required: z
    .boolean()
    .optional()
    .describe('Whether the parameter is required, when supplied'),
  label: z.string().optional().describe('Human-readable parameter label'),
  defaultValue: z.unknown().optional().describe('Default value configured on the robot'),
  raw: rawSchema.optional()
});

export let mapRobot = (robot: ApiObject) => ({
  robotId: text(robot.id, 'robot ID'),
  ...pickDefined({
    name: optionalText(robot.name, 'robot name'),
    createdAt: optionalNumber(robot.createdAt, 'robot creation timestamp'),
    inputParameters:
      robot.inputParameters == null
        ? undefined
        : objects(robot.inputParameters, 'robot input parameters').map(parameter => ({
            name: text(parameter.name, 'parameter name'),
            ...pickDefined({
              type: optionalText(parameter.type, 'parameter type'),
              required: optionalFlag(parameter.required, 'parameter required flag'),
              label: optionalText(parameter.label, 'parameter label'),
              defaultValue: parameter.defaultValue ?? undefined,
              raw: parameter
            })
          })),
    raw: robot
  })
});

export let mapTask = (task: ApiObject) => ({
  taskId: text(task.id, 'task ID'),
  status: text(task.status, 'task status'),
  robotId: text(task.robotId, 'task robot ID'),
  ...pickDefined({
    capturedTexts: optionalObject(task.capturedTexts, 'captured texts'),
    capturedScreenshots: optionalObject(task.capturedScreenshots, 'captured screenshots'),
    capturedLists: optionalObject(task.capturedLists, 'captured lists'),
    inputParameters: optionalObject(task.inputParameters, 'task input parameters'),
    createdAt: optionalNumber(task.createdAt, 'task creation timestamp'),
    startedAt: optionalNumber(task.startedAt, 'task start timestamp'),
    finishedAt: optionalNumber(task.finishedAt, 'task completion timestamp'),
    userFriendlyError: optionalText(task.userFriendlyError, 'task error'),
    videoUrl: optionalText(task.videoUrl, 'task video URL'),
    capturedDataTemporaryUrl: optionalText(task.capturedDataTemporaryUrl, 'task data URL'),
    robotBulkRunId: optionalText(task.robotBulkRunId, 'task bulk run ID'),
    runByTaskMonitorId: optionalText(task.runByTaskMonitorId, 'task monitor ID'),
    retriedOriginalTaskId: optionalText(task.retriedOriginalTaskId, 'original task ID'),
    retriedByTaskId: optionalText(task.retriedByTaskId, 'retry task ID'),
    raw: task
  })
});

export let mapBulkRun = (bulkRun: ApiObject) => ({
  bulkRunId: text(bulkRun.id, 'bulk run ID'),
  status: text(bulkRun.status, 'bulk run status'),
  ...pickDefined({
    title: optionalText(bulkRun.title, 'bulk run title'),
    totalTaskCount: optionalNumber(
      bulkRun.tasksCount ?? bulkRun.totalTaskCount,
      'bulk run task count'
    ),
    successfulTaskCount: optionalNumber(
      bulkRun.successfulTasks ?? bulkRun.successfulTaskCount,
      'bulk run successful count'
    ),
    failedTaskCount: optionalNumber(
      bulkRun.failedTasks ?? bulkRun.failedTaskCount,
      'bulk run failed count'
    ),
    robotId: optionalText(bulkRun.robotId, 'bulk run robot ID'),
    createdAt: optionalNumber(bulkRun.createdAt, 'bulk run creation timestamp'),
    finishedAt: optionalNumber(bulkRun.finishedAt, 'bulk run completion timestamp'),
    raw: bulkRun
  })
});

export let mapWebhook = (webhook: ApiObject) => ({
  webhookId: text(webhook.id, 'webhook ID'),
  hookUrl: text(webhook.url ?? webhook.hookUrl, 'webhook URL'),
  eventType: text(webhook.webhookEvent ?? webhook.eventType, 'webhook event type'),
  ...pickDefined({
    createdAt: optionalNumber(webhook.createdAt, 'webhook creation timestamp'),
    raw: webhook
  })
});

export let bulkRunSummarySchema = z.object({
  bulkRunId: z.string().describe('Bulk run ID'),
  title: z.string().optional().describe('Bulk run title when present'),
  status: z.string().describe('Provider bulk run state'),
  robotId: z.string().optional().describe('Robot that owns the bulk run'),
  totalTaskCount: z.number().optional().describe('Total tasks reported by Browse AI'),
  successfulTaskCount: z
    .number()
    .optional()
    .describe('Successful tasks reported by Browse AI'),
  failedTaskCount: z.number().optional().describe('Failed tasks reported by Browse AI'),
  createdAt: z.number().optional().describe('Creation timestamp in milliseconds'),
  finishedAt: z.number().optional().describe('Completion timestamp when present'),
  raw: rawSchema.optional()
});
