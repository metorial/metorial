import { SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../../lib/client';
import { adfEquals, andFilters } from '../../lib/filters';
import { booleanField, idField, type OracleRecord, stringField } from '../../lib/records';
import {
  pageOutputFields,
  paginationInputFields,
  resourceIdSchema,
  resourceKeySchema
} from '../../lib/schemas';
import { spec } from '../../spec';
import {
  assertAssignmentEffectiveDate,
  assignmentKeySchema,
  assignmentParentInputFields,
  assignmentsPath,
  dateContext,
  effectiveDateInputSchema,
  effectiveDateOutputFields,
  effectiveRangeOutputFields,
  requiredId,
  selfLinkOutputSchema
} from './common';

const ASSIGNMENT_FIELDS =
  'AssignmentId,AssignmentNumber,AssignmentName,AssignmentStatusType,AssignmentType,BusinessUnitId,BusinessUnitName,DepartmentId,DepartmentName,JobId,JobName,LocationId,LocationName,EffectiveStartDate,EffectiveEndDate,PrimaryFlag';
const ASSIGNMENT_FILTER_FIELDS = ['AssignmentNumber', 'PrimaryFlag'] as const;

let assignmentOutputFields = {
  ...assignmentParentInputFields,
  resourceKey: resourceKeySchema.describe(
    'Composite assignment key from its self link. Pass this as assignmentKey to get_worker_assignment or list_assignment_managers with the same parent keys. This is not assignmentId or assignmentNumber.'
  ),
  assignmentId: resourceIdSchema.describe(
    'Stable Oracle identifier for the worker assignment.'
  ),
  assignmentNumber: z
    .string()
    .optional()
    .describe('Business number assigned to the worker assignment.'),
  assignmentName: z.string().optional().describe('Business title of the worker assignment.'),
  assignmentStatusType: z.string().optional().describe('Status type of the assignment.'),
  assignmentType: z
    .string()
    .optional()
    .describe('Assignment type, such as employee or contingent worker.'),
  businessUnitId: resourceIdSchema
    .optional()
    .describe('Identifier of the assignment’s business unit.'),
  businessUnitName: z.string().optional().describe('Name of the assignment’s business unit.'),
  departmentId: resourceIdSchema
    .optional()
    .describe(
      'Identifier of the worker’s department. Use list_departments to discover department details.'
    ),
  departmentName: z.string().optional().describe('Name of the worker’s department.'),
  jobId: resourceIdSchema
    .optional()
    .describe('Identifier of the worker’s job. Use list_jobs to discover job details.'),
  jobName: z.string().optional().describe('Name of the worker’s job.'),
  locationId: resourceIdSchema
    .optional()
    .describe(
      'Identifier of the work location. Use list_locations to discover location details.'
    ),
  locationName: z.string().optional().describe('Name of the work location.'),
  ...effectiveRangeOutputFields,
  primaryFlag: z
    .boolean()
    .optional()
    .describe('Whether this is the worker’s primary assignment.'),
  selfLink: selfLinkOutputSchema
};

let mapAssignment = (
  client: OracleFusionClient,
  record: OracleRecord,
  workerKey: string,
  workRelationshipKey: string
) => {
  let path = assignmentsPath(client, workerKey, workRelationshipKey);
  return {
    workerKey,
    workRelationshipKey,
    resourceKey: client.resourceKey(record, 'hcm', path),
    assignmentId: requiredId(record, 'AssignmentId'),
    assignmentNumber: stringField(record, 'AssignmentNumber'),
    assignmentName: stringField(record, 'AssignmentName'),
    assignmentStatusType: stringField(record, 'AssignmentStatusType'),
    assignmentType: stringField(record, 'AssignmentType'),
    businessUnitId: idField(record, 'BusinessUnitId'),
    businessUnitName: stringField(record, 'BusinessUnitName'),
    departmentId: idField(record, 'DepartmentId'),
    departmentName: stringField(record, 'DepartmentName'),
    jobId: idField(record, 'JobId'),
    jobName: stringField(record, 'JobName'),
    locationId: idField(record, 'LocationId'),
    locationName: stringField(record, 'LocationName'),
    effectiveStartDate: stringField(record, 'EffectiveStartDate'),
    effectiveEndDate: stringField(record, 'EffectiveEndDate'),
    primaryFlag: booleanField(record, 'PrimaryFlag'),
    selfLink: client.selfLink(record, 'hcm', path)
  };
};

export let listWorkerAssignments = SlateTool.create(spec, {
  name: 'List Worker Assignments',
  key: 'list_worker_assignments',
  description:
    'List authorized job assignments for an Oracle Fusion HCM worker’s work relationship, including organizational placement, work location, and effective dates.',
  instructions: [
    'Discover workerKey with list_workers and workRelationshipKey with list_worker_work_relationships. Pass an assignment resourceKey as assignmentKey to get_worker_assignment or list_assignment_managers.',
    'Keep workerKey and workRelationshipKey from the same discovery chain. Use the same effectiveDate for every navigation request.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...assignmentParentInputFields,
      ...paginationInputFields,
      assignmentNumber: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe('Exact business assignment number. Combined with primaryFlag using AND.'),
      primaryFlag: z
        .boolean()
        .optional()
        .describe('Filter by whether the assignment is primary for the worker.'),
      effectiveDate: effectiveDateInputSchema
    })
  )
  .output(
    z.object({
      items: z
        .array(z.object(assignmentOutputFields))
        .describe('Worker assignments in this page.'),
      ...pageOutputFields,
      ...effectiveDateOutputFields
    })
  )
  .handleInvocation(async ctx => {
    let context = dateContext(ctx.input.effectiveDate);
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list(
      'hcm',
      assignmentsPath(client, ctx.input.workerKey, ctx.input.workRelationshipKey),
      {
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        q: andFilters(
          ctx.input.assignmentNumber === undefined
            ? undefined
            : adfEquals(
                'AssignmentNumber',
                ctx.input.assignmentNumber,
                ASSIGNMENT_FILTER_FIELDS
              ),
          ctx.input.primaryFlag === undefined
            ? undefined
            : adfEquals('PrimaryFlag', ctx.input.primaryFlag, ASSIGNMENT_FILTER_FIELDS)
        ),
        fields: ASSIGNMENT_FIELDS,
        links: 'self',
        orderBy:
          'AssignmentId:asc,EffectiveStartDate:asc,EffectiveEndDate:asc,EffectiveSequence:asc,EffectiveLatestChange:asc',
        effectiveDate: context.effectiveDate
      }
    );
    return {
      output: {
        ...page,
        items: page.items.map(record =>
          mapAssignment(client, record, ctx.input.workerKey, ctx.input.workRelationshipKey)
        ),
        ...context
      },
      message: `Retrieved ${page.count} worker assignments.`
    };
  })
  .build();

export let getWorkerAssignment = SlateTool.create(spec, {
  name: 'Get Worker Assignment',
  key: 'get_worker_assignment',
  description:
    'Get an authorized Oracle Fusion HCM worker assignment using its resource key and parent keys discovered with the worker and work relationship list tools.',
  instructions: [
    'Call list_worker_assignments to discover assignmentKey and retain its workerKey and workRelationshipKey. assignmentId and assignmentNumber cannot replace the composite assignmentKey.',
    'Use the same effectiveDate used to discover all three keys.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...assignmentParentInputFields,
      assignmentKey: assignmentKeySchema,
      effectiveDate: effectiveDateInputSchema
    })
  )
  .output(z.object({ ...assignmentOutputFields, ...effectiveDateOutputFields }))
  .handleInvocation(async ctx => {
    let context = dateContext(ctx.input.effectiveDate);
    let client = new OracleFusionClient(ctx.auth);
    let record = await client.get(
      'hcm',
      assignmentsPath(client, ctx.input.workerKey, ctx.input.workRelationshipKey),
      ctx.input.assignmentKey,
      { fields: ASSIGNMENT_FIELDS, links: 'self', effectiveDate: context.effectiveDate }
    );
    assertAssignmentEffectiveDate(record, context.effectiveDate);
    return {
      output: {
        ...mapAssignment(client, record, ctx.input.workerKey, ctx.input.workRelationshipKey),
        ...context
      },
      message: 'Retrieved the worker assignment.'
    };
  })
  .build();
