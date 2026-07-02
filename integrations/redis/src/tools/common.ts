import { z } from 'zod';
import { redisServiceError } from '../lib/errors';

export let subscriptionTypeSchema = z
  .enum(['pro', 'essentials'])
  .default('pro')
  .describe('Subscription type');

export let taskStateSchema = z.object({
  taskId: z.string().describe('Task ID'),
  commandType: z.string().optional().describe('Operation type'),
  status: z.string().optional().describe('Task status'),
  timestamp: z.string().optional().describe('Task timestamp'),
  resourceId: z.number().optional().describe('ID of the created or modified resource'),
  description: z.string().optional().describe('Task description or error message'),
  raw: z.any().describe('Full API response')
});

export let extractTaskState = (task: any, fallbackTaskId?: string) => ({
  taskId: String(task?.taskId || task?.id || fallbackTaskId || ''),
  commandType: task?.commandType,
  status: task?.status,
  timestamp: task?.timestamp,
  resourceId: task?.response?.resourceId,
  description: task?.description || task?.response?.error?.description,
  raw: task
});

export let requireInputFields = (
  input: Record<string, unknown>,
  fields: string[],
  message: string
) => {
  let hasAllFields = fields.every(field => input[field] !== undefined);
  if (!hasAllFields) {
    throw redisServiceError(message);
  }
};

export let requireAtLeastOneInputField = (
  input: Record<string, unknown>,
  fields: string[],
  message: string
) => {
  let hasAnyField = fields.some(field => input[field] !== undefined);
  if (!hasAnyField) {
    throw redisServiceError(message);
  }
};

export let rejectInputFields = (
  input: Record<string, unknown>,
  fields: string[],
  message: string
) => {
  let hasRejectedField = fields.some(field => input[field] !== undefined);
  if (hasRejectedField) {
    throw redisServiceError(message);
  }
};
