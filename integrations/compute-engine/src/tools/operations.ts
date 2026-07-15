import { SlateTool } from 'slates';
import { z } from 'zod';
import { ComputeEngineClient } from '../lib/client';
import { resolveComputeEngineZone } from '../lib/errors';
import { computeEngineActionScopes } from '../scopes';
import { spec } from '../spec';

let ZONE_OPERATION_FIELDS =
  'id,name,zone,status,statusMessage,operationType,targetLink,targetId,progress,insertTime,startTime,endTime,creationTimestamp,error,warnings,httpErrorMessage,httpErrorStatusCode';

export interface ZoneOperationDetails {
  id: string;
  name: string;
  status: string;
  zone?: string;
  statusMessage?: string;
  operationType?: string;
  targetLink?: string;
  targetId?: string;
  progress?: number;
  insertTime?: string;
  startTime?: string;
  endTime?: string;
  /** Deprecated by Compute Engine. Kept as a response fallback for compatibility. */
  creationTimestamp?: string;
  error?: {
    errors?: Record<string, unknown>[];
    [key: string]: unknown;
  };
  warnings?: Array<{
    code?: string;
    message?: string;
    data?: Array<{ key?: string; value?: string }>;
    [key: string]: unknown;
  }>;
  httpErrorMessage?: string;
  httpErrorStatusCode?: number;
}

let arbitraryObjectSchema = z.record(z.string(), z.unknown());

let operationErrorSchema = z
  .object({
    errors: z
      .array(arbitraryObjectSchema)
      .optional()
      .describe('Structured errors encountered by the operation')
  })
  .passthrough();

let operationWarningSchema = z
  .object({
    code: z.string().optional().describe('Warning code'),
    message: z.string().optional().describe('Human-readable warning message'),
    data: z
      .array(
        z.object({
          key: z.string().optional().describe('Metadata key for the warning datum'),
          value: z.string().optional().describe('Metadata value for the warning datum')
        })
      )
      .optional()
      .describe('Warning metadata key-value pairs')
  })
  .passthrough();

let zoneOperationSchema = z.object({
  id: z.string().describe('Compute Engine operation ID'),
  name: z.string().describe('Compute Engine operation name'),
  status: z.string().describe('Operation status: PENDING, RUNNING, or DONE'),
  zone: z.string().optional().describe('Zone resource URL for the operation'),
  statusMessage: z.string().optional().describe('Human-readable operation status details'),
  operationType: z.string().optional().describe('Operation type, such as insert or delete'),
  targetLink: z.string().optional().describe('Resource URL modified by the operation'),
  targetId: z.string().optional().describe('Unique ID of the target resource incarnation'),
  progress: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .describe('Monotonically increasing progress indicator from 0 through 100'),
  insertTime: z.string().optional().describe('RFC3339 time the operation was requested'),
  startTime: z.string().optional().describe('RFC3339 time the operation started'),
  endTime: z.string().optional().describe('RFC3339 time the operation completed'),
  createTime: z
    .string()
    .optional()
    .describe(
      'Compatibility alias for insertTime; the API creationTimestamp field is deprecated'
    ),
  error: operationErrorSchema.optional().describe('Errors encountered by the operation'),
  warnings: z
    .array(operationWarningSchema)
    .optional()
    .describe('Warnings encountered by the operation'),
  httpErrorMessage: z
    .string()
    .optional()
    .describe('HTTP error message for a failed operation'),
  httpErrorStatusCode: z
    .number()
    .int()
    .optional()
    .describe('HTTP status code for a failed operation')
});

let zoneInput = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe('Compute Engine zone; defaults to the configured defaultZone');

let nameInput = z.string().trim().min(1).describe('Compute Engine zone operation name');

let createClient = (ctx: {
  auth: { token: string };
  config: { projectId: string; defaultZone?: string; defaultRegion?: string };
}) =>
  new ComputeEngineClient({
    token: ctx.auth.token,
    projectId: ctx.config.projectId,
    defaultZone: ctx.config.defaultZone,
    defaultRegion: ctx.config.defaultRegion
  });

export let getZoneOperation = SlateTool.create(spec, {
  name: 'Get Zone Operation',
  key: 'get_zone_operation',
  description:
    'Get a Compute Engine zone operation status, target, progress, request/start/end timestamps, errors, warnings, and HTTP failure details for polling asynchronous VM changes.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(z.object({ zone: zoneInput, name: nameInput }))
  .output(zoneOperationSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let operation = await client.request<ZoneOperationDetails>('get zone operation', {
      method: 'get',
      path: client.projectPath(
        `zones/${encodeURIComponent(zone)}/operations/${encodeURIComponent(ctx.input.name)}`
      ),
      params: { fields: ZONE_OPERATION_FIELDS }
    });

    return {
      output: {
        id: operation.id,
        name: operation.name,
        status: operation.status,
        zone: operation.zone,
        statusMessage: operation.statusMessage,
        operationType: operation.operationType,
        targetLink: operation.targetLink,
        targetId: operation.targetId,
        progress: operation.progress,
        insertTime: operation.insertTime,
        startTime: operation.startTime,
        endTime: operation.endTime,
        createTime: operation.insertTime ?? operation.creationTimestamp,
        error: operation.error,
        warnings: operation.warnings,
        httpErrorMessage: operation.httpErrorMessage,
        httpErrorStatusCode: operation.httpErrorStatusCode
      },
      message: `Zone operation **${operation.name}** in **${zone}** is **${operation.status}**.`
    };
  })
  .build();
