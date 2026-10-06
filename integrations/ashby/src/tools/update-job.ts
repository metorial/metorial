import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { id, invalid, mapJob, pageSchema, row, text, warningsSchema } from '../lib/contracts';
import { spec } from '../spec';

const compensationSchema = z
  .object({
    compensationTiers: z.array(
      z
        .object({
          title: z.string().nullable().optional(),
          additionalInformation: z.string().nullable().optional(),
          components: z.array(
            z
              .object({
                compensationType: z.enum([
                  'Salary',
                  'EquityPercentage',
                  'EquityCashValue',
                  'Bonus',
                  'Commission'
                ]),
                interval: z.enum([
                  'NONE',
                  '1 TIME',
                  '1 HOUR',
                  '1 DAY',
                  '1 WEEK',
                  '2 WEEK',
                  '1 MONTH',
                  '2 MONTH',
                  '1 YEAR',
                  '6 MONTH',
                  '0.5 MONTH',
                  '3 MONTH'
                ]),
                label: z.string().nullable().optional(),
                currencyCode: z
                  .string()
                  .regex(/^[A-Z]{3}$/)
                  .nullable()
                  .optional(),
                minValue: z.number().finite().nullable().optional(),
                maxValue: z.number().finite().nullable().optional()
              })
              .strict()
              .refine(
                c => c.minValue == null || c.maxValue == null || c.minValue <= c.maxValue
              )
          )
        })
        .strict()
    )
  })
  .strict();

export let updateJob = SlateTool.create(spec, {
  name: 'Update Job',
  key: 'update_job',
  description: `Updates a job's details, status, or compensation. Supports changing the title, location, department, status, and compensation in a single call.`,
  instructions: [
    'Only include fields you want to change.',
    'Status changes use a separate endpoint and can be combined with other updates.',
    'Compensation updates are also handled separately and can be combined with other field changes.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The ID of the job to update'),
      title: z.string().optional().describe('New job title'),
      status: z
        .enum(['Open', 'Closed', 'Archived', 'Draft'])
        .optional()
        .describe('New job status'),
      locationId: z.string().optional().describe('New location ID'),
      departmentId: z.string().optional().describe('New department ID'),
      compensation: z
        .record(z.string(), z.any())
        .optional()
        .describe('Compensation details to update')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      title: z.string(),
      status: z.string(),
      locationId: z.string().optional(),
      departmentId: z.string().optional(),
      updatedAt: z.string(),
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth),
      input = ctx.input,
      jobId = id(input.jobId, 'Job ID');
    const fields = {
      title: input.title === undefined ? undefined : text(input.title, 'Title'),
      teamId:
        input.departmentId === undefined
          ? undefined
          : id(input.departmentId, 'Department/team ID'),
      locationId:
        input.locationId === undefined ? undefined : id(input.locationId, 'Location ID')
    };
    let compensationTiers: unknown;
    if (input.compensation !== undefined) {
      const parsed = compensationSchema.safeParse(input.compensation);
      if (!parsed.success)
        invalid(
          'compensation must contain the documented compensationTiers array with components. Use an empty array only to deliberately clear all tiers.'
        );
      if (
        parsed.data.compensationTiers.length > 1 &&
        parsed.data.compensationTiers.some(tier => !tier.title?.trim())
      )
        invalid(
          'Each compensation tier requires a title when more than one tier is supplied.'
        );
      compensationTiers = parsed.data.compensationTiers;
    }
    const steps: { label: string; run: () => Promise<unknown> }[] = [];
    if (input.status !== undefined)
      steps.push({
        label: 'job.setStatus',
        run: () => client.exact('/job.setStatus', { jobId, status: input.status }, jobId)
      });
    if (compensationTiers !== undefined)
      steps.push({
        label: 'job.updateCompensation',
        run: () => client.exact('/job.updateCompensation', { jobId, compensationTiers }, jobId)
      });
    if (Object.values(fields).some(value => value !== undefined))
      steps.push({
        label: 'job.update',
        run: () => client.exact('/job.update', { jobId, ...fields }, jobId)
      });
    if (!steps.length)
      invalid('Provide at least one job detail, status or compensation change.');
    let job: Record<string, unknown> = {};
    const completedActions = await client.sequence([
      ...steps,
      {
        label: 'job.readback',
        run: async () => {
          job = row((await client.getJob(jobId)).results);
        }
      }
    ]);
    return {
      output: { ...mapJob(job), warnings: client.warnings, completedActions },
      message:
        'Job operations accepted and exact state read back. Operations are not atomic; compensation tiers replace the previous tiers.'
    };
  })
  .build();
