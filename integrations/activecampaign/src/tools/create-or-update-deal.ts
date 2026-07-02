import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { activeCampaignServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createOrUpdateDeal = SlateTool.create(spec, {
  name: 'Create or Update Deal',
  key: 'create_or_update_deal',
  description: `Creates a new deal or updates an existing one. When creating, provide title, contactId, pipelineId, and stageId at minimum. When updating, provide the dealId and only the fields you want to change. The value is in cents (e.g., 10000 = $100.00).`,
  instructions: [
    'The "pipelineId" field corresponds to the "group" parameter in the ActiveCampaign API.',
    'Deal status: 0 = open, 1 = won, 2 = lost.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dealId: z
        .string()
        .optional()
        .describe('ID of the deal to update (omit to create a new deal)'),
      title: z.string().optional().describe('Title of the deal'),
      contactId: z.string().optional().describe('ID of the primary contact'),
      accountId: z.string().optional().describe('ID of the associated account'),
      description: z.string().optional().describe('Description of the deal'),
      currency: z.string().optional().describe('Three-letter currency code (e.g., "usd")'),
      pipelineId: z.string().optional().describe('ID of the pipeline'),
      stageId: z.string().optional().describe('ID of the stage within the pipeline'),
      ownerId: z.string().optional().describe('User ID of the deal owner'),
      value: z.number().optional().describe('Deal value in cents (e.g., 10000 = $100.00)'),
      percent: z.number().optional().describe('Win probability percentage'),
      status: z.number().optional().describe('Deal status: 0=open, 1=won, 2=lost'),
      customFields: z
        .array(
          z.object({
            customFieldId: z.number().describe('ID of the custom field'),
            fieldValue: z.string().describe('Value for the custom field'),
            fieldCurrency: z
              .string()
              .optional()
              .describe('Currency code for currency-type fields')
          })
        )
        .optional()
        .describe('Custom field values')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the deal'),
      title: z.string().optional().describe('Title of the deal'),
      value: z.string().optional().describe('Deal value'),
      currency: z.string().optional().describe('Currency code'),
      pipelineId: z.string().optional().describe('Pipeline ID'),
      stageId: z.string().optional().describe('Stage ID'),
      status: z.string().optional().describe('Deal status'),
      createdAt: z.string().optional().describe('Date the deal was created'),
      updatedAt: z.string().optional().describe('Date the deal was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let dealInput = {
      title: ctx.input.title,
      contactId: ctx.input.contactId,
      accountId: ctx.input.accountId,
      description: ctx.input.description,
      currency: ctx.input.currency,
      pipelineId: ctx.input.pipelineId,
      stageId: ctx.input.stageId,
      ownerId: ctx.input.ownerId,
      value: ctx.input.value,
      percent: ctx.input.percent,
      status: ctx.input.status,
      fields: ctx.input.customFields
    };

    let result: any;
    if (ctx.input.dealId) {
      result = await client.updateDeal(ctx.input.dealId, dealInput);
    } else {
      if (!ctx.input.title) {
        throw activeCampaignServiceError('title is required when creating a deal');
      }
      if (!ctx.input.contactId && !ctx.input.accountId) {
        throw activeCampaignServiceError(
          'contactId or accountId is required when creating a deal'
        );
      }
      if (!ctx.input.pipelineId && !ctx.input.stageId) {
        throw activeCampaignServiceError(
          'pipelineId or stageId is required when creating a deal'
        );
      }
      result = await client.createDeal(dealInput);
    }

    let deal = result.deal;

    return {
      output: {
        dealId: deal.id,
        title: deal.title || undefined,
        value: deal.value || undefined,
        currency: deal.currency || undefined,
        pipelineId: deal.group || undefined,
        stageId: deal.stage || undefined,
        status: String(deal.status),
        createdAt: deal.cdate || undefined,
        updatedAt: deal.mdate || undefined
      },
      message: ctx.input.dealId
        ? `Deal **${deal.title || deal.id}** updated.`
        : `Deal **${deal.title || deal.id}** created.`
    };
  })
  .build();
