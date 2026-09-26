import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../../lib/client';
import { adfEquals, adfIdEquals, andFilters } from '../../lib/filters';
import { idField, type OracleRecord, stringField } from '../../lib/records';
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
  effectiveRangeOutputFields,
  identifierFilterSchema,
  requiredId,
  selfLinkOutputSchema
} from './common';

const DEPARTMENT_FIELDS =
  'OrganizationId,Name,OrganizationCode,ClassificationCode,Status,LocationId,EffectiveStartDate,EffectiveEndDate';
const DEPARTMENT_FILTER_FIELDS = [
  'ClassificationCode',
  'OrganizationId',
  'Name',
  'OrganizationCode',
  'Status'
] as const;
const DEPARTMENT_CLASSIFICATION = 'DEPARTMENT';

let departmentOutputFields = {
  resourceKey: resourceKeySchema.describe(
    'Composite department resource key from its self link. This is separate from departmentId.'
  ),
  departmentId: resourceIdSchema.describe(
    'Stable Oracle organization identifier for the department. This matches departmentId on worker assignments.'
  ),
  departmentName: z.string().optional().describe('Name of the department.'),
  departmentCode: z.string().optional().describe('Code of the department.'),
  classificationCode: z
    .literal(DEPARTMENT_CLASSIFICATION)
    .describe('Organization classification identifying this record as a department.'),
  locationId: resourceIdSchema
    .optional()
    .describe(
      'Identifier of the department’s work location. Use list_locations to discover its details.'
    ),
  status: z
    .string()
    .optional()
    .describe('Department status, such as A for active or I for inactive.'),
  ...effectiveRangeOutputFields,
  selfLink: selfLinkOutputSchema
};

let mapDepartment = (client: OracleFusionClient, record: OracleRecord) => {
  let classificationCode = stringField(record, 'ClassificationCode');
  if (classificationCode !== DEPARTMENT_CLASSIFICATION) {
    throw createApiServiceError(
      'Oracle Fusion returned an organization that is not classified as a department.',
      {
        reason: 'oracle_fusion_invalid_response'
      }
    );
  }
  return {
    resourceKey: client.resourceKey(record, 'hcm', '/organizations'),
    departmentId: requiredId(record, 'OrganizationId'),
    departmentName: stringField(record, 'Name'),
    departmentCode: stringField(record, 'OrganizationCode'),
    classificationCode: 'DEPARTMENT' as const,
    locationId: idField(record, 'LocationId'),
    status: stringField(record, 'Status'),
    effectiveStartDate: stringField(record, 'EffectiveStartDate'),
    effectiveEndDate: stringField(record, 'EffectiveEndDate'),
    selfLink: client.selfLink(record, 'hcm', '/organizations')
  };
};

export let listDepartments = SlateTool.create(spec, {
  name: 'List Departments',
  key: 'list_departments',
  description:
    'List authorized Oracle Fusion HCM departments as of an effective date, optionally filtered by exact identifier, name, code, or status.',
  instructions: [
    'Only organizations classified as departments are returned. All supplied exact filters are combined using AND.',
    'Use departmentId to match departmentId on worker assignments. resourceKey is a separate composite resource identifier.',
    'When comparing departments with worker assignments, use the same effectiveDate on both requests.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...paginationInputFields,
      departmentId: identifierFilterSchema.describe(
        'Exact departmentId, for example from a worker assignment. Represent the identifier as decimal digits.'
      ),
      departmentName: z.string().min(1).max(240).optional().describe('Exact department name.'),
      departmentCode: z.string().min(1).max(500).optional().describe('Exact department code.'),
      status: z
        .enum(['A', 'I'])
        .optional()
        .describe('Exact department status: A active or I inactive.'),
      effectiveDate: effectiveDateInputSchema
    })
  )
  .output(
    z.object({
      items: z.array(z.object(departmentOutputFields)).describe('Departments in this page.'),
      ...pageOutputFields,
      ...effectiveDateOutputFields
    })
  )
  .handleInvocation(async ctx => {
    let context = dateContext(ctx.input.effectiveDate);
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('hcm', '/organizations', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q: andFilters(
        adfEquals('ClassificationCode', DEPARTMENT_CLASSIFICATION, DEPARTMENT_FILTER_FIELDS),
        adfIdEquals('OrganizationId', ctx.input.departmentId, DEPARTMENT_FILTER_FIELDS),
        ctx.input.departmentName === undefined
          ? undefined
          : adfEquals('Name', ctx.input.departmentName, DEPARTMENT_FILTER_FIELDS),
        ctx.input.departmentCode === undefined
          ? undefined
          : adfEquals('OrganizationCode', ctx.input.departmentCode, DEPARTMENT_FILTER_FIELDS),
        ctx.input.status === undefined
          ? undefined
          : adfEquals('Status', ctx.input.status, DEPARTMENT_FILTER_FIELDS)
      ),
      fields: DEPARTMENT_FIELDS,
      links: 'self',
      orderBy: 'OrganizationId:asc,EffectiveStartDate:asc,EffectiveEndDate:asc',
      effectiveDate: context.effectiveDate
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => mapDepartment(client, record)),
        ...context
      },
      message: `Retrieved ${page.count} departments.`
    };
  })
  .build();
