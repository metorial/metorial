import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { pipedriveServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDeals = SlateTool.create(spec, {
  name: 'Manage Deals',
  key: 'manage_deals',
  description: `Create, update, or delete deals in Pipedrive. Use this to add new deals to pipelines, update deal properties (title, value, stage, status, owner, expected close date), or remove deals.
Supports attaching deals to persons, organizations, and pipelines. Custom fields can be set via their API keys.`,
  instructions: [
    'To create a deal, provide at minimum a title. Optionally set value, currency, pipelineId, stageId, and other properties.',
    'To update a deal, provide the dealId and any fields to change.',
    'To delete a deal, provide the dealId and set action to "delete".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform on the deal'),
      dealId: z.number().optional().describe('Deal ID (required for update and delete)'),
      title: z.string().optional().describe('Deal title (required for create)'),
      value: z.string().optional().describe('Deal monetary value'),
      currency: z.string().optional().describe('Deal currency code (e.g. USD, EUR)'),
      personId: z.number().optional().describe('Person ID to link to the deal'),
      organizationId: z.number().optional().describe('Organization ID to link to the deal'),
      pipelineId: z.number().optional().describe('Pipeline ID for the deal'),
      stageId: z.number().optional().describe('Stage ID within the pipeline'),
      status: z.enum(['open', 'won', 'lost', 'deleted']).optional().describe('Deal status'),
      expectedCloseDate: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
      probability: z.number().optional().describe('Deal success probability percentage'),
      lostReason: z
        .string()
        .optional()
        .describe('Reason the deal was lost (when status=lost)'),
      visibleTo: z
        .enum(['1', '3', '5', '7'])
        .optional()
        .describe(
          'Visibility: 1=owner only, 3=owner group, 5=owner group+sub, 7=entire company'
        ),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by field API key')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('ID of the deal'),
      title: z.string().optional().describe('Deal title'),
      value: z.number().optional().describe('Deal value'),
      currency: z.string().optional().describe('Deal currency'),
      status: z.string().optional().describe('Deal status'),
      stageId: z.number().optional().describe('Current stage ID'),
      pipelineId: z.number().optional().describe('Pipeline ID'),
      personId: z.number().optional().nullable().describe('Linked person ID'),
      organizationId: z.number().optional().nullable().describe('Linked organization ID'),
      ownerName: z.string().optional().describe('Owner user name'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp'),
      wonTime: z.string().optional().nullable().describe('Time deal was won'),
      lostTime: z.string().optional().nullable().describe('Time deal was lost'),
      expectedCloseDate: z.string().optional().nullable().describe('Expected close date'),
      deleted: z.boolean().optional().describe('Whether the deal was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'delete') {
      if (!ctx.input.dealId)
        throw pipedriveServiceError('dealId is required for delete action');
      await client.deleteDeal(ctx.input.dealId);
      return {
        output: { dealId: ctx.input.dealId, deleted: true },
        message: `Deal **#${ctx.input.dealId}** has been deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.value) body.value = ctx.input.value;
    if (ctx.input.currency) body.currency = ctx.input.currency;
    if (ctx.input.personId) body.person_id = ctx.input.personId;
    if (ctx.input.organizationId) body.org_id = ctx.input.organizationId;
    if (ctx.input.pipelineId) body.pipeline_id = ctx.input.pipelineId;
    if (ctx.input.stageId) body.stage_id = ctx.input.stageId;
    if (ctx.input.status) body.status = ctx.input.status;
    if (ctx.input.expectedCloseDate) body.expected_close_date = ctx.input.expectedCloseDate;
    if (ctx.input.probability !== undefined) body.probability = ctx.input.probability;
    if (ctx.input.lostReason) body.lost_reason = ctx.input.lostReason;
    if (ctx.input.visibleTo) body.visible_to = ctx.input.visibleTo;
    if (ctx.input.customFields) {
      Object.assign(body, ctx.input.customFields);
    }

    let result: any;
    if (ctx.input.action === 'create') {
      result = await client.createDeal(body);
    } else {
      if (!ctx.input.dealId)
        throw pipedriveServiceError('dealId is required for update action');
      result = await client.updateDeal(ctx.input.dealId, body);
    }

    let deal = result?.data;

    let output = {
      dealId: deal?.id,
      title: deal?.title,
      value: deal?.value,
      currency: deal?.currency,
      status: deal?.status,
      stageId: deal?.stage_id,
      pipelineId: deal?.pipeline_id,
      personId: deal?.person_id?.value ?? deal?.person_id,
      organizationId: deal?.org_id?.value ?? deal?.org_id,
      ownerName: deal?.owner_name,
      addTime: deal?.add_time,
      updateTime: deal?.update_time,
      wonTime: deal?.won_time,
      lostTime: deal?.lost_time,
      expectedCloseDate: deal?.expected_close_date
    };

    let action = ctx.input.action === 'create' ? 'created' : 'updated';
    return {
      output,
      message: `Deal **"${deal?.title}"** (ID: ${deal?.id}) has been ${action}.`
    };
  });
