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
  dateContext,
  effectiveDateInputSchema,
  effectiveDateOutputFields,
  requiredId,
  selfLinkOutputSchema,
  workerKeySchema,
  workRelationshipsPath
} from './common';

const WORK_RELATIONSHIP_FIELDS =
  'PeriodOfServiceId,LegalEntityId,LegalEmployerName,WorkerType,WorkerTypeMeaning,WorkerNumber,StartDate,TerminationDate,PrimaryFlag';
const WORK_RELATIONSHIP_FILTER_FIELDS = ['WorkerType', 'PrimaryFlag'] as const;

let workRelationshipOutputFields = {
  workerKey: workerKeySchema,
  resourceKey: resourceKeySchema.describe(
    'Work relationship key from its self link. Pass this as workRelationshipKey with workerKey to list_worker_assignments. This is separate from periodOfServiceId.'
  ),
  periodOfServiceId: resourceIdSchema.describe(
    'Stable identifier of the work relationship’s period of service.'
  ),
  legalEntityId: resourceIdSchema
    .optional()
    .describe('Identifier of the work relationship’s legal entity.'),
  legalEmployerName: z
    .string()
    .optional()
    .describe('Legal employer for the work relationship.'),
  workerType: z
    .string()
    .optional()
    .describe('Worker type code, such as E for employee or C for contingent worker.'),
  workerTypeMeaning: z.string().optional().describe('Display meaning of the worker type.'),
  workerNumber: z.string().optional().describe('Worker number for this period of service.'),
  startDate: z.string().optional().describe('Start date of the period of employment.'),
  terminationDate: z
    .string()
    .optional()
    .describe('Last date of employment for this period of service, when terminated.'),
  primaryFlag: z
    .boolean()
    .optional()
    .describe('Whether this is the worker’s primary work relationship.'),
  selfLink: selfLinkOutputSchema
};

let mapWorkRelationship = (
  client: OracleFusionClient,
  record: OracleRecord,
  workerKey: string
) => {
  let path = workRelationshipsPath(client, workerKey);
  return {
    workerKey,
    resourceKey: client.resourceKey(record, 'hcm', path),
    periodOfServiceId: requiredId(record, 'PeriodOfServiceId'),
    legalEntityId: idField(record, 'LegalEntityId'),
    legalEmployerName: stringField(record, 'LegalEmployerName'),
    workerType: stringField(record, 'WorkerType'),
    workerTypeMeaning: stringField(record, 'WorkerTypeMeaning'),
    workerNumber: stringField(record, 'WorkerNumber'),
    startDate: stringField(record, 'StartDate'),
    terminationDate: stringField(record, 'TerminationDate'),
    primaryFlag: booleanField(record, 'PrimaryFlag'),
    selfLink: client.selfLink(record, 'hcm', path)
  };
};

export let listWorkerWorkRelationships = SlateTool.create(spec, {
  name: 'List Worker Work Relationships',
  key: 'list_worker_work_relationships',
  description:
    'List authorized work relationships for an Oracle Fusion HCM worker discovered with list_workers, including legal employer and employment dates.',
  instructions: [
    'Call list_workers to discover workerKey. Pass each returned resourceKey as workRelationshipKey to list_worker_assignments together with the same workerKey.',
    'Use the same effectiveDate for worker discovery and every work relationship, assignment, and manager request. Oracle resource keys can depend on the effective date.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      workerKey: workerKeySchema,
      ...paginationInputFields,
      workerType: z
        .enum(['E', 'C', 'P', 'N'])
        .optional()
        .describe(
          'Exact worker type: E employee, C contingent worker, P pending worker, or N nonworker. Combined with primaryFlag using AND.'
        ),
      primaryFlag: z
        .boolean()
        .optional()
        .describe('Filter by whether the work relationship is primary for the worker.'),
      effectiveDate: effectiveDateInputSchema
    })
  )
  .output(
    z.object({
      items: z
        .array(z.object(workRelationshipOutputFields))
        .describe('Work relationships in this page.'),
      ...pageOutputFields,
      ...effectiveDateOutputFields
    })
  )
  .handleInvocation(async ctx => {
    let context = dateContext(ctx.input.effectiveDate);
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('hcm', workRelationshipsPath(client, ctx.input.workerKey), {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q: andFilters(
        ctx.input.workerType === undefined
          ? undefined
          : adfEquals('WorkerType', ctx.input.workerType, WORK_RELATIONSHIP_FILTER_FIELDS),
        ctx.input.primaryFlag === undefined
          ? undefined
          : adfEquals('PrimaryFlag', ctx.input.primaryFlag, WORK_RELATIONSHIP_FILTER_FIELDS)
      ),
      fields: WORK_RELATIONSHIP_FIELDS,
      links: 'self',
      orderBy: 'PeriodOfServiceId:asc',
      effectiveDate: context.effectiveDate
    });
    return {
      output: {
        ...page,
        items: page.items.map(record =>
          mapWorkRelationship(client, record, ctx.input.workerKey)
        ),
        ...context
      },
      message: `Retrieved ${page.count} worker work relationships.`
    };
  })
  .build();
