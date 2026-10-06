import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import type { DeelParameters } from '../lib/client';
import { isDeelNotFound } from '../lib/errors';
import {
  acknowledgedData,
  dataList,
  dataObject,
  exactResourceId,
  pageSchema,
  requireDate,
  requireNumber,
  requireText,
  resourceSchema,
  responsePage,
  validateLimit,
  validateOffset
} from '../lib/response';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let manageInvoiceAdjustments = SlateTool.create(spec, {
  name: 'Manage Invoice Adjustments',
  key: 'manage_invoice_adjustments',
  description: `Create, list, read, review or delete invoice adjustments for contractor contracts. Adjustments include bonuses, commissions, deductions, expenses, overtime, and more. Use "list" to retrieve, "create" to add, or "review" to approve/decline.`,
  tags: { destructive: true },
  instructions: [
    'For "list": optionally filter by contractId or adjustment types.',
    'For "create": provide the contractId, amount, type (e.g. "bonus", "expense", "deduction"), and description.',
    'For "review": provide the adjustmentId and reviewStatus ("approved" or "declined").'
  ]
})
  .scopes(anyOf('invoice-adjustments:read', 'invoice-adjustments:write', 'worker:write'))
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'review', 'get', 'delete'])
        .describe('Action to perform'),
      contractId: z
        .string()
        .optional()
        .describe('Contract ID (for "list" to filter by contract, and for "create")'),
      types: z
        .array(z.string())
        .optional()
        .describe('For "list": filter by adjustment types (e.g. "bonus", "expense")'),
      amount: z.number().optional().describe('For "create": adjustment amount'),
      currencyCode: z
        .string()
        .optional()
        .describe('Legacy field: omit; the contract currency applies'),
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
      adjustmentId: z.string().optional().describe('For get, review or delete: adjustment ID'),
      reviewStatus: z
        .enum(['approved', 'declined'])
        .optional()
        .describe('For "review": approval decision'),
      reviewReason: z.string().optional().describe('For "review": reason for the decision'),
      dateSubmitted: z
        .string()
        .optional()
        .describe('For create: required submission date YYYY-MM-DD'),
      limit: z.number().optional().describe('For list: page size 1–100'),
      offset: z.number().optional().describe('For list: page offset')
    })
  )
  .output(
    z.object({
      adjustments: z
        .array(resourceSchema)
        .optional()
        .describe('List of invoice adjustments (for "list")'),
      adjustment: z
        .record(z.string(), z.any())
        .optional()
        .describe('Provider creation or review acknowledgement'),
      page: pageSchema.optional(),
      deleted: z.boolean().optional(),
      resourceId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'get': {
        let id = requireText(ctx.input.adjustmentId, 'adjustmentId');
        let adjustment = dataObject(await client.getInvoiceAdjustment(id), 'adjustment');
        if (exactResourceId(adjustment.id) !== id)
          throw createApiServiceError('Deel returned a different adjustment identity.');
        return { output: { adjustment }, message: `Retrieved adjustment **${id}**.` };
      }
      case 'delete': {
        let id = requireText(ctx.input.adjustmentId, 'adjustmentId');
        acknowledgedData(
          await client.deleteInvoiceAdjustment(id),
          'delete adjustment',
          'deleted'
        );
        try {
          await client.getInvoiceAdjustment(id);
        } catch (error) {
          if (isDeelNotFound(error))
            return {
              output: { deleted: true, resourceId: id },
              message: `Deleted adjustment **${id}** and confirmed it is no longer available.`
            };
          throw createApiServiceError(
            'Deel acknowledged deletion but removal could not be verified. Check the resource before retrying.'
          );
        }
        throw createApiServiceError(
          'Deel acknowledged deletion but the resource is still readable. Verify its state before retrying.'
        );
      }
      case 'list': {
        validateLimit(ctx.input.limit, 100);
        validateOffset(ctx.input.offset);
        let params: DeelParameters = { limit: ctx.input.limit, offset: ctx.input.offset };
        if (ctx.input.types) params.types = ctx.input.types;

        let result = ctx.input.contractId
          ? await client.listContractInvoiceAdjustments(ctx.input.contractId, params)
          : await client.listInvoiceAdjustments(params);

        let adjustments = dataList(result, 'invoice adjustments');
        let page = responsePage(result);
        return {
          output: { adjustments, page },
          message: `Found ${adjustments.length} invoice adjustment(s).`
        };
      }

      case 'create': {
        requireText(ctx.input.contractId, 'contractId');
        requireNumber(ctx.input.amount, 'amount');
        requireDate(ctx.input.dateSubmitted, 'dateSubmitted');
        let adjustmentType = requireText(ctx.input.adjustmentType, 'adjustmentType');
        if (
          ![
            'bonus',
            'commission',
            'deduction',
            'expense',
            'other',
            'overtime',
            'time_off',
            'vat'
          ].includes(adjustmentType)
        )
          throw createApiServiceError('Use a documented adjustmentType.');
        if (ctx.input.currencyCode !== undefined)
          throw createApiServiceError(
            'Invoice adjustments use the contract currency. Omit currencyCode; Deel does not support a per-adjustment currency.'
          );

        let data: Record<string, unknown> = {
          contract_id: ctx.input.contractId,
          date_submitted: ctx.input.dateSubmitted,
          description: ctx.input.description ?? '',
          is_auto_approved: false
        };
        if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;

        if (ctx.input.adjustmentType) data.type = ctx.input.adjustmentType;
        if (ctx.input.description) data.description = ctx.input.description;

        let result = await client.createInvoiceAdjustment(data, ctx.input.recurring);
        let adjustment = acknowledgedData(result, 'adjustment action');
        return {
          output: { adjustment },
          message: `Created **${ctx.input.adjustmentType ?? 'invoice'}** adjustment of ${ctx.input.amount} for contract **${ctx.input.contractId}**.`
        };
      }

      case 'review': {
        let adjustmentId = requireText(ctx.input.adjustmentId, 'adjustmentId');
        let status = requireText(ctx.input.reviewStatus, 'reviewStatus');

        let reviewData: { status: string; reason?: string } = {
          status
        };
        if (ctx.input.reviewReason) reviewData.reason = ctx.input.reviewReason;

        let result = await client.reviewInvoiceAdjustment(adjustmentId, reviewData);
        let adjustment = acknowledgedData(result, 'adjustment action');
        return {
          output: { adjustment },
          message: `Invoice adjustment **${ctx.input.adjustmentId}** has been **${ctx.input.reviewStatus}**.`
        };
      }
    }
  })
  .build();
