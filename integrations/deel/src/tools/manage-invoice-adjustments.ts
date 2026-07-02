import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let manageInvoiceAdjustments = SlateTool.create(spec, {
  name: 'Manage Invoice Adjustments',
  key: 'manage_invoice_adjustments',
  description: `Create, list, or review invoice adjustments for contractor contracts. Adjustments include bonuses, commissions, deductions, expenses, overtime, and more. Use "list" to retrieve, "create" to add, or "review" to approve/decline.`,
  instructions: [
    'For "list": optionally filter by contractId or adjustment types.',
    'For "create": provide the contractId, amount, type (e.g. "bonus", "expense", "deduction"), and description.',
    'For "review": provide the adjustmentId and reviewStatus ("approved" or "declined").'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'review']).describe('Action to perform'),
      contractId: z
        .string()
        .optional()
        .describe('Contract ID (for "list" to filter by contract, and for "create")'),
      types: z
        .array(z.string())
        .optional()
        .describe('For "list": filter by adjustment types (e.g. "bonus", "expense")'),
      amount: z.number().optional().describe('For "create": adjustment amount'),
      currencyCode: z.string().optional().describe('For "create": currency code (e.g. "USD")'),
      adjustmentType: z
        .string()
        .optional()
        .describe(
          'For "create": type of adjustment (e.g. "bonus", "commission", "deduction", "expense", "overtime")'
        ),
      description: z
        .string()
        .optional()
        .describe('For "create": description of the adjustment'),
      recurring: z
        .boolean()
        .optional()
        .describe('For "create": whether this is a recurring adjustment'),
      adjustmentId: z
        .string()
        .optional()
        .describe('For "review": ID of the adjustment to review'),
      reviewStatus: z
        .enum(['approved', 'declined'])
        .optional()
        .describe('For "review": approval decision'),
      reviewReason: z.string().optional().describe('For "review": reason for the decision')
    })
  )
  .output(
    z.object({
      adjustments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of invoice adjustments (for "list")'),
      adjustment: z
        .record(z.string(), z.any())
        .optional()
        .describe('Created or reviewed adjustment')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'list': {
        let params: Record<string, any> = {};
        if (ctx.input.types) params['types[]'] = ctx.input.types;

        let result = ctx.input.contractId
          ? await client.listContractInvoiceAdjustments(ctx.input.contractId, params)
          : await client.listInvoiceAdjustments(params);

        let adjustments = result?.data ?? [];
        return {
          output: { adjustments },
          message: `Found ${adjustments.length} invoice adjustment(s).`
        };
      }

      case 'create': {
        if (!ctx.input.contractId)
          throw new Error('contractId is required for creating an invoice adjustment');

        let data: Record<string, any> = {
          contract_id: ctx.input.contractId
        };
        if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
        if (ctx.input.currencyCode) data.currency = ctx.input.currencyCode;
        if (ctx.input.adjustmentType) data.type = ctx.input.adjustmentType;
        if (ctx.input.description) data.description = ctx.input.description;
        if (ctx.input.recurring !== undefined) data.recurring = ctx.input.recurring;

        let result = await client.createInvoiceAdjustment(data);
        let adjustment = result?.data ?? result;
        return {
          output: { adjustment },
          message: `Created **${ctx.input.adjustmentType ?? 'invoice'}** adjustment of ${ctx.input.amount} for contract **${ctx.input.contractId}**.`
        };
      }

      case 'review': {
        if (!ctx.input.adjustmentId)
          throw new Error('adjustmentId is required for reviewing an adjustment');
        if (!ctx.input.reviewStatus)
          throw new Error('reviewStatus is required for reviewing an adjustment');

        let reviewData: { status: string; reason?: string } = {
          status: ctx.input.reviewStatus
        };
        if (ctx.input.reviewReason) reviewData.reason = ctx.input.reviewReason;

        let result = await client.reviewInvoiceAdjustment(ctx.input.adjustmentId, reviewData);
        let adjustment = result?.data ?? result;
        return {
          output: { adjustment },
          message: `Invoice adjustment **${ctx.input.adjustmentId}** has been **${ctx.input.reviewStatus}**.`
        };
      }
    }
  })
  .build();
