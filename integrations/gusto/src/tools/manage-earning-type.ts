import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  defaultEarningTypes: z
    .array(
      z.object({
        earningTypeId: z.string().describe('UUID of the earning type'),
        name: z.string().nullable().optional().describe('Name')
      })
    )
    .optional()
    .describe('Default earning types (for list action)'),
  customEarningTypes: z
    .array(
      z.object({
        earningTypeId: z.string().describe('UUID of the earning type'),
        name: z.string().nullable().optional().describe('Name')
      })
    )
    .optional()
    .describe('Custom earning types'),
  earningType: z
    .object({
      earningTypeId: z.string().describe('UUID of the earning type'),
      name: z.string().nullable().optional().describe('Name')
    })
    .optional()
    .describe('Created or updated earning type')
});

export let manageEarningType = SlateTool.create(spec, {
  name: 'Manage Earning Type',
  key: 'manage_earning_type',
  description: `List, create, or update custom earning types for a company. Earning types define categories of compensation (e.g., bonuses, commissions, tips) beyond standard types.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
      companyId: companyIdSchema,
      earningTypeId: z.string().optional().describe('Earning type UUID (required for update)'),
      name: z.string().optional().describe('Name of the earning type')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx =>
    invokeGusto('manage_earning_type', ctx.input, ctx.auth, outputSchema)
  )
  .build();
