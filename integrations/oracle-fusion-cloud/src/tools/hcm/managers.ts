import { SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../../lib/client';
import { adfEquals } from '../../lib/filters';
import { idField, stringField } from '../../lib/records';
import {
  pageOutputFields,
  paginationInputFields,
  resourceIdSchema,
  resourceKeySchema
} from '../../lib/schemas';
import { spec } from '../../spec';
import {
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

const MANAGER_FIELDS =
  'AssignmentSupervisorId,ManagerAssignmentId,ManagerAssignmentNumber,ManagerType,ManagerTypeMeaning,EffectiveStartDate,EffectiveEndDate';
const MANAGER_FILTER_FIELDS = ['ManagerType'] as const;

let managerOutputFields = {
  ...assignmentParentInputFields,
  assignmentKey: assignmentKeySchema,
  resourceKey: resourceKeySchema.describe(
    'Composite manager relationship key from its self link. This is separate from assignmentSupervisorId.'
  ),
  assignmentSupervisorId: resourceIdSchema.describe(
    'Stable identifier for this assignment supervisor relationship.'
  ),
  managerAssignmentId: resourceIdSchema
    .optional()
    .describe('Identifier of the manager’s assignment.'),
  managerAssignmentNumber: z
    .string()
    .optional()
    .describe('Business assignment number of the manager.'),
  managerType: z
    .string()
    .optional()
    .describe('Manager role code, such as line manager or project leader.'),
  managerTypeMeaning: z.string().optional().describe('Display meaning of the manager role.'),
  ...effectiveRangeOutputFields,
  selfLink: selfLinkOutputSchema
};

export let listAssignmentManagers = SlateTool.create(spec, {
  name: 'List Assignment Managers',
  key: 'list_assignment_managers',
  description:
    'List authorized manager relationships for an Oracle Fusion HCM worker assignment discovered with list_worker_assignments, including manager assignment identifiers and role types.',
  instructions: [
    'Discover workerKey with list_workers, workRelationshipKey with list_worker_work_relationships, and assignmentKey with list_worker_assignments.',
    'Keep the three keys from the same discovery chain and use the same effectiveDate for every navigation request. Use composite resource keys rather than person, period-of-service, or assignment identifiers.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...assignmentParentInputFields,
      assignmentKey: assignmentKeySchema,
      ...paginationInputFields,
      managerType: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe('Exact Oracle manager role code, for example LINE_MANAGER.'),
      effectiveDate: effectiveDateInputSchema
    })
  )
  .output(
    z.object({
      items: z
        .array(z.object(managerOutputFields))
        .describe('Assignment manager relationships in this page.'),
      ...pageOutputFields,
      ...effectiveDateOutputFields
    })
  )
  .handleInvocation(async ctx => {
    let context = dateContext(ctx.input.effectiveDate);
    let client = new OracleFusionClient(ctx.auth);
    let path = client.childCollectionPath(
      assignmentsPath(client, ctx.input.workerKey, ctx.input.workRelationshipKey),
      ctx.input.assignmentKey,
      'managers'
    );
    let page = await client.list('hcm', path, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q:
        ctx.input.managerType === undefined
          ? undefined
          : adfEquals('ManagerType', ctx.input.managerType, MANAGER_FILTER_FIELDS),
      fields: MANAGER_FIELDS,
      links: 'self',
      orderBy: 'AssignmentSupervisorId:asc,EffectiveStartDate:asc,EffectiveEndDate:asc',
      effectiveDate: context.effectiveDate
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => ({
          workerKey: ctx.input.workerKey,
          workRelationshipKey: ctx.input.workRelationshipKey,
          assignmentKey: ctx.input.assignmentKey,
          resourceKey: client.resourceKey(record, 'hcm', path),
          assignmentSupervisorId: requiredId(record, 'AssignmentSupervisorId'),
          managerAssignmentId: idField(record, 'ManagerAssignmentId'),
          managerAssignmentNumber: stringField(record, 'ManagerAssignmentNumber'),
          managerType: stringField(record, 'ManagerType'),
          managerTypeMeaning: stringField(record, 'ManagerTypeMeaning'),
          effectiveStartDate: stringField(record, 'EffectiveStartDate'),
          effectiveEndDate: stringField(record, 'EffectiveEndDate'),
          selfLink: client.selfLink(record, 'hcm', path)
        })),
        ...context
      },
      message: `Retrieved ${page.count} assignment manager relationships.`
    };
  })
  .build();
