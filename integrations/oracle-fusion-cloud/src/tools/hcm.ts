import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../lib/client';
import { adfEquals, andFilters } from '../lib/filters';
import { idField, type OracleRecord, stringField } from '../lib/records';
import { pageOutputFields, paginationInputFields, resourceKeySchema } from '../lib/schemas';
import { spec } from '../spec';
import { getWorkerAssignment, listWorkerAssignments } from './hcm/assignments';
import { listDepartments } from './hcm/departments';
import { listJobs } from './hcm/jobs';
import { listLocations } from './hcm/locations';
import { listAssignmentManagers } from './hcm/managers';
import { listWorkerWorkRelationships } from './hcm/workRelationships';

const WORKER_FIELDS = 'PersonId,PersonNumber,DisplayName';
const WORKER_FILTER_FIELDS = ['PersonNumber', 'DisplayName'] as const;

let effectiveDateInputSchema = z
  .string()
  .optional()
  .describe(
    'Date to view the worker directory as of, in YYYY-MM-DD format. Omit to use Oracle Fusion’s current date.'
  );

let effectiveDateOutputFields = {
  effectiveDate: z
    .string()
    .optional()
    .describe(
      'Explicit effective date sent to Oracle Fusion. Omitted when using its current date.'
    ),
  effectiveDateMode: z
    .enum(['specified', 'current'])
    .describe(
      'Whether the request uses the specified effective date or Oracle Fusion’s current date.'
    )
};

let workerOutputFields = {
  resourceKey: resourceKeySchema.describe(
    'Opaque worker key from the resource self link. Pass this to get_worker as workerKey; it can differ from personId.'
  ),
  personId: z.string().min(1).describe('Oracle person identifier represented as a string.'),
  personNumber: z
    .string()
    .optional()
    .describe('Business person number assigned by Oracle Fusion.'),
  displayName: z
    .string()
    .optional()
    .describe('Display name projected from the worker resource when available.'),
  selfLink: z
    .string()
    .url()
    .optional()
    .describe(
      'Worker resource self URL verified to belong to the connected Oracle Fusion instance.'
    )
};

let dateContext = (
  effectiveDate: string | undefined
): { effectiveDate?: string; effectiveDateMode: 'specified' | 'current' } => {
  if (effectiveDate !== undefined) {
    let parsed = new Date(`${effectiveDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) ||
      effectiveDate.startsWith('0000-') ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== effectiveDate
    ) {
      throw createApiServiceError(
        'effectiveDate must be a real calendar date in YYYY-MM-DD format.',
        { reason: 'oracle_fusion_invalid_effective_date' }
      );
    }
  }
  return {
    effectiveDate,
    effectiveDateMode: effectiveDate === undefined ? 'current' : 'specified'
  };
};

let mapWorker = (client: OracleFusionClient, record: OracleRecord) => {
  let personId = idField(record, 'PersonId');
  if (!personId) {
    throw createApiServiceError(
      'Oracle Fusion returned a worker without a person identifier.',
      {
        reason: 'oracle_fusion_invalid_response'
      }
    );
  }
  return {
    resourceKey: client.resourceKey(record, 'hcm', '/workers'),
    personId,
    personNumber: stringField(record, 'PersonNumber'),
    displayName: stringField(record, 'DisplayName'),
    selfLink: client.selfLink(record, 'hcm', '/workers')
  };
};

export let listWorkers = SlateTool.create(spec, {
  name: 'List Workers',
  key: 'list_workers',
  description:
    'List authorized Oracle Fusion HCM worker directory entries, optionally filtered by exact person number or display name and viewed as of an effective date.',
  instructions: [
    'Use the returned resourceKey as workerKey in get_worker. The personId and personNumber are separate identifiers.',
    'Display name is requested explicitly on the worker resource. Full name-specific details belong to its names child resource.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...paginationInputFields,
      personNumber: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe(
          'Exact person number to match. Combined with displayName using AND when both are set.'
        ),
      displayName: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe(
          'Exact display name to match. Combined with personNumber using AND when both are set.'
        ),
      effectiveDate: effectiveDateInputSchema
    })
  )
  .output(
    z.object({
      items: z
        .array(z.object(workerOutputFields))
        .describe('Worker directory entries in this page.'),
      ...pageOutputFields,
      ...effectiveDateOutputFields
    })
  )
  .handleInvocation(async ctx => {
    let context = dateContext(ctx.input.effectiveDate);
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('hcm', '/workers', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q: andFilters(
        ctx.input.personNumber === undefined
          ? undefined
          : adfEquals('PersonNumber', ctx.input.personNumber, WORKER_FILTER_FIELDS),
        ctx.input.displayName === undefined
          ? undefined
          : adfEquals('DisplayName', ctx.input.displayName, WORKER_FILTER_FIELDS)
      ),
      fields: WORKER_FIELDS,
      links: 'self',
      orderBy: 'PersonId:asc',
      effectiveDate: context.effectiveDate
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => mapWorker(client, record)),
        ...context
      },
      message: `Retrieved ${page.count} worker directory entries.`
    };
  })
  .build();

export let getWorker = SlateTool.create(spec, {
  name: 'Get Worker',
  key: 'get_worker',
  description:
    'Get an authorized Oracle Fusion HCM worker directory entry using a resource key discovered with list_workers, optionally as of an effective date.',
  instructions: [
    'Call list_workers to discover workerKey. Use resourceKey rather than personId or personNumber.',
    'Use the same effectiveDate used to discover workerKey. To view another date, rediscover the worker with list_workers at that date.',
    'Display name is requested explicitly on the worker resource. Full name-specific details belong to its names child resource.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      workerKey: resourceKeySchema.describe(
        'Opaque worker resourceKey returned by list_workers or get_worker. This is not the personId or personNumber.'
      ),
      effectiveDate: effectiveDateInputSchema
    })
  )
  .output(z.object({ ...workerOutputFields, ...effectiveDateOutputFields }))
  .handleInvocation(async ctx => {
    let context = dateContext(ctx.input.effectiveDate);
    let client = new OracleFusionClient(ctx.auth);
    let record = await client.get('hcm', '/workers', ctx.input.workerKey, {
      fields: WORKER_FIELDS,
      links: 'self',
      effectiveDate: context.effectiveDate
    });
    return {
      output: { ...mapWorker(client, record), ...context },
      message: 'Retrieved the worker directory entry.'
    };
  })
  .build();

export let hcmTools = {
  list_workers: listWorkers,
  get_worker: getWorker,
  list_worker_work_relationships: listWorkerWorkRelationships,
  list_worker_assignments: listWorkerAssignments,
  get_worker_assignment: getWorkerAssignment,
  list_assignment_managers: listAssignmentManagers,
  list_departments: listDepartments,
  list_jobs: listJobs,
  list_locations: listLocations
};
