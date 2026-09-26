import { SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../../lib/client';
import { adfEquals, adfIdEquals, andFilters } from '../../lib/filters';
import { idField, stringField } from '../../lib/records';
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

const JOB_FIELDS = 'JobId,JobCode,Name,SetId,ActiveStatus,EffectiveStartDate,EffectiveEndDate';
const JOB_FILTER_FIELDS = ['JobId', 'JobCode', 'Name', 'ActiveStatus'] as const;

let jobOutputFields = {
  resourceKey: resourceKeySchema.describe(
    'Composite job resource key from its self link. This is separate from jobId or jobCode.'
  ),
  jobId: resourceIdSchema.describe(
    'Stable Oracle job identifier. This matches jobId on worker assignments.'
  ),
  jobCode: z.string().optional().describe('Business code of the job.'),
  name: z.string().optional().describe('Name of the job.'),
  setId: resourceIdSchema
    .optional()
    .describe('Identifier of the reference data set to which the job belongs.'),
  activeStatus: z
    .string()
    .optional()
    .describe('Job status, such as A for active or I for inactive.'),
  ...effectiveRangeOutputFields,
  selfLink: selfLinkOutputSchema
};

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description:
    'List authorized Oracle Fusion HCM jobs as of an effective date, optionally filtered by exact job identifier, code, name, or active status.',
  instructions: [
    'All supplied exact filters are combined using AND. jobId matches the jobId on worker assignments; resourceKey is a separate composite resource identifier.',
    'When comparing jobs with worker assignments, use the same effectiveDate on both requests.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...paginationInputFields,
      jobId: identifierFilterSchema.describe(
        'Exact jobId, for example from a worker assignment. Represent the identifier as decimal digits.'
      ),
      jobCode: z.string().min(1).max(30).optional().describe('Exact job code.'),
      name: z.string().min(1).max(240).optional().describe('Exact job name.'),
      activeStatus: z
        .enum(['A', 'I'])
        .optional()
        .describe('Exact job status: A active or I inactive.'),
      effectiveDate: effectiveDateInputSchema
    })
  )
  .output(
    z.object({
      items: z.array(z.object(jobOutputFields)).describe('Jobs in this page.'),
      ...pageOutputFields,
      ...effectiveDateOutputFields
    })
  )
  .handleInvocation(async ctx => {
    let context = dateContext(ctx.input.effectiveDate);
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('hcm', '/jobs', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q: andFilters(
        adfIdEquals('JobId', ctx.input.jobId, JOB_FILTER_FIELDS),
        ctx.input.jobCode === undefined
          ? undefined
          : adfEquals('JobCode', ctx.input.jobCode, JOB_FILTER_FIELDS),
        ctx.input.name === undefined
          ? undefined
          : adfEquals('Name', ctx.input.name, JOB_FILTER_FIELDS),
        ctx.input.activeStatus === undefined
          ? undefined
          : adfEquals('ActiveStatus', ctx.input.activeStatus, JOB_FILTER_FIELDS)
      ),
      fields: JOB_FIELDS,
      links: 'self',
      orderBy: 'JobId:asc,EffectiveStartDate:asc,EffectiveEndDate:asc',
      effectiveDate: context.effectiveDate
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => ({
          resourceKey: client.resourceKey(record, 'hcm', '/jobs'),
          jobId: requiredId(record, 'JobId'),
          jobCode: stringField(record, 'JobCode'),
          name: stringField(record, 'Name'),
          setId: idField(record, 'SetId'),
          activeStatus: stringField(record, 'ActiveStatus'),
          effectiveStartDate: stringField(record, 'EffectiveStartDate'),
          effectiveEndDate: stringField(record, 'EffectiveEndDate'),
          selfLink: client.selfLink(record, 'hcm', '/jobs')
        })),
        ...context
      },
      message: `Retrieved ${page.count} jobs.`
    };
  })
  .build();
