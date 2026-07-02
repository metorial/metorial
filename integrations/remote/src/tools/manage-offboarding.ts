import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageOffboarding = SlateTool.create(spec, {
  name: 'Manage Offboarding',
  key: 'manage_offboarding',
  description: `Create, list, or retrieve offboarding (termination) requests. Initiate an employee offboarding by specifying the employment, termination date, and reason. Track the offboarding status through the review and payroll submission process.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'get']).describe('Action to perform'),
      offboardingId: z.string().optional().describe('Offboarding request ID (for get)'),
      employmentId: z.string().optional().describe('Employment ID (for create, list filter)'),
      terminationDate: z
        .string()
        .optional()
        .describe('Planned termination date (YYYY-MM-DD) for create'),
      terminationReason: z.string().optional().describe('Reason for termination'),
      additionalComments: z
        .string()
        .optional()
        .describe('Additional comments about the offboarding'),
      confidential: z.boolean().optional().describe('Whether the offboarding is confidential'),
      type: z
        .string()
        .optional()
        .describe('Offboarding type (e.g., termination, resignation)'),
      proposedLastWorkingDate: z
        .string()
        .optional()
        .describe('Proposed last working date (YYYY-MM-DD)'),
      status: z.string().optional().describe('Filter by status when listing'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Page size')
    })
  )
  .output(
    z.object({
      offboarding: z
        .record(z.string(), z.any())
        .optional()
        .describe('Single offboarding record'),
      offboardings: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of offboarding records'),
      totalCount: z.number().optional().describe('Total count for list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    if (ctx.input.action === 'create') {
      let result = await client.createOffboarding({
        employmentId: ctx.input.employmentId!,
        terminationDate: ctx.input.terminationDate!,
        terminationReason: ctx.input.terminationReason,
        additionalComments: ctx.input.additionalComments,
        confidential: ctx.input.confidential,
        type: ctx.input.type,
        proposedLastWorkingDate: ctx.input.proposedLastWorkingDate
      });
      let offboarding = result?.data ?? result?.offboarding ?? result;
      return {
        output: { offboarding },
        message: `Created offboarding request for employment **${ctx.input.employmentId}** with termination date **${ctx.input.terminationDate}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let result = await client.getOffboarding(ctx.input.offboardingId!);
      let offboarding = result?.data ?? result?.offboarding ?? result;
      return {
        output: { offboarding },
        message: `Retrieved offboarding **${ctx.input.offboardingId}**.`
      };
    }

    // list
    let result = await client.listOffboardings({
      employmentId: ctx.input.employmentId,
      status: ctx.input.status,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });
    let offboardings = result?.data ?? result?.offboardings ?? [];
    let totalCount = result?.total_count ?? offboardings.length;
    return {
      output: { offboardings, totalCount },
      message: `Found **${totalCount}** offboarding request(s).`
    };
  });
