import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDeal = SlateTool.create(spec, {
  name: 'Manage Deal',
  key: 'manage_deal',
  description: `Create, update, retrieve, or delete a deal (transaction) in Follow Up Boss. Deals track real estate transactions with associated properties, prices, commission, and pipeline stages.`,
  instructions: [
    'To create a deal, provide at least a name and personId.',
    'To update, provide the dealId and the fields to change.',
    'To retrieve, provide only the dealId.',
    'To delete, set "delete" to true with a dealId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      dealId: z
        .number()
        .optional()
        .describe('ID of an existing deal to update, retrieve, or delete'),
      personId: z.number().optional().describe('Contact ID associated with the deal'),
      name: z.string().optional().describe('Deal name'),
      pipelineId: z.number().optional().describe('Pipeline ID'),
      stageId: z.number().optional().describe('Pipeline stage ID'),
      dealType: z.string().optional().describe('Deal type (e.g., "Buying", "Selling")'),
      price: z.number().optional().describe('Deal price'),
      commission: z.number().optional().describe('Commission amount'),
      commissionPercent: z.number().optional().describe('Commission percentage'),
      closingDate: z.string().optional().describe('Expected closing date (ISO 8601)'),
      propertyStreet: z.string().optional().describe('Property street address'),
      propertyCity: z.string().optional().describe('Property city'),
      propertyState: z.string().optional().describe('Property state'),
      propertyZip: z.string().optional().describe('Property ZIP code'),
      mlsNumber: z.string().optional().describe('MLS listing number'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Deal custom field values as key-value pairs'),
      delete: z.boolean().optional().describe('Set to true to delete the deal')
    })
  )
  .output(
    z.object({
      dealId: z.number().optional(),
      personId: z.number().optional(),
      name: z.string().optional(),
      pipelineId: z.number().optional(),
      stageId: z.number().optional(),
      dealType: z.string().optional(),
      price: z.number().optional(),
      closingDate: z.string().optional(),
      created: z.string().optional(),
      updated: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.delete && ctx.input.dealId) {
      await client.deleteDeal(ctx.input.dealId);
      return {
        output: { dealId: ctx.input.dealId, deleted: true },
        message: `Deleted deal **${ctx.input.dealId}**.`
      };
    }

    if (
      ctx.input.dealId &&
      !ctx.input.name &&
      !ctx.input.personId &&
      !ctx.input.pipelineId &&
      !ctx.input.stageId &&
      !ctx.input.dealType &&
      !ctx.input.price &&
      !ctx.input.commission &&
      !ctx.input.commissionPercent &&
      !ctx.input.closingDate &&
      !ctx.input.propertyStreet &&
      !ctx.input.propertyCity &&
      !ctx.input.propertyState &&
      !ctx.input.propertyZip &&
      !ctx.input.mlsNumber &&
      !ctx.input.customFields
    ) {
      let deal = await client.getDeal(ctx.input.dealId);
      return {
        output: {
          dealId: deal.id,
          personId: deal.personId,
          name: deal.name,
          pipelineId: deal.pipelineId,
          stageId: deal.stageId,
          dealType: deal.dealType,
          price: deal.price,
          closingDate: deal.closingDate,
          created: deal.created,
          updated: deal.updated
        },
        message: `Retrieved deal **${deal.name || deal.id}**.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.personId !== undefined) data.personId = ctx.input.personId;
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.pipelineId !== undefined) data.pipelineId = ctx.input.pipelineId;
    if (ctx.input.stageId !== undefined) data.stageId = ctx.input.stageId;
    if (ctx.input.dealType !== undefined) data.dealType = ctx.input.dealType;
    if (ctx.input.price !== undefined) data.price = ctx.input.price;
    if (ctx.input.commission !== undefined) data.commission = ctx.input.commission;
    if (ctx.input.commissionPercent !== undefined)
      data.commissionPercent = ctx.input.commissionPercent;
    if (ctx.input.closingDate !== undefined) data.closingDate = ctx.input.closingDate;
    if (ctx.input.propertyStreet !== undefined) data.propertyStreet = ctx.input.propertyStreet;
    if (ctx.input.propertyCity !== undefined) data.propertyCity = ctx.input.propertyCity;
    if (ctx.input.propertyState !== undefined) data.propertyState = ctx.input.propertyState;
    if (ctx.input.propertyZip !== undefined) data.propertyZip = ctx.input.propertyZip;
    if (ctx.input.mlsNumber !== undefined) data.mlsNumber = ctx.input.mlsNumber;
    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        data[key] = value;
      }
    }

    let deal: any;
    let action: string;

    if (ctx.input.dealId) {
      deal = await client.updateDeal(ctx.input.dealId, data);
      action = 'Updated';
    } else {
      deal = await client.createDeal(data);
      action = 'Created';
    }

    return {
      output: {
        dealId: deal.id,
        personId: deal.personId,
        name: deal.name,
        pipelineId: deal.pipelineId,
        stageId: deal.stageId,
        dealType: deal.dealType,
        price: deal.price,
        closingDate: deal.closingDate,
        created: deal.created,
        updated: deal.updated
      },
      message: `${action} deal **${deal.name || deal.id}**.`
    };
  })
  .build();
