import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';
export const resourceRoutes = {
  supplier: 'suppliers',
  requisition: 'requisitions',
  expense_report: 'expense_reports',
  contract: 'contracts',
  approval: 'approvals',
  user: 'users',
  account: 'accounts',
  receipt: 'receiving_transactions'
} as const;
export const resourceTypes = [
  'supplier',
  'requisition',
  'expense_report',
  'contract',
  'approval',
  'user',
  'account',
  'receipt'
] as const;
export const getResource = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description:
    'Read one exact supplier, requisition, expense report, contract, approval, user, account or receiving receipt. Returns native fields and identifiers; this does not identify the authenticated person.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resourceType: z.enum(resourceTypes).describe('Documented Coupa resource type'),
      resourceId: z.number().describe('Exact native integer ID from a list or create result')
    })
  )
  .output(
    z.object({
      resourceType: z.enum(resourceTypes),
      resourceId: z.number(),
      status: z.string().nullable().optional(),
      rawData: z
        .record(z.string(), z.unknown())
        .describe('Native data with documented credential fields omitted')
    })
  )
  .handleInvocation(async ctx => {
    const row = await CoupaClient.from(ctx).getResource(
      resourceRoutes[ctx.input.resourceType],
      ctx.input.resourceId
    );
    return {
      output: {
        resourceType: ctx.input.resourceType,
        resourceId: row.id,
        status: row.status ?? null,
        rawData: row
      },
      message: `Retrieved ${ctx.input.resourceType} #${row.id}.`
    };
  })
  .build();
