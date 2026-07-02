import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dealEventTypes = [
  'deal_add',
  'deal_update',
  'deal_note_add',
  'deal_task_add',
  'deal_task_complete',
  'deal_tasktype_add',
  'deal_pipeline_add',
  'deal_stage_add'
] as const;

export let dealEvents = SlateTrigger.create(spec, {
  name: 'Deal Events',
  key: 'deal_events',
  description:
    'Triggers when a deal is created, updated, moved between pipelines/stages, or when notes and tasks are added to deals.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of deal event'),
      payload: z.record(z.string(), z.any()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      dealId: z.string().optional().describe('ID of the affected deal'),
      dealTitle: z.string().optional().describe('Title of the deal'),
      dealValue: z.string().optional().describe('Value of the deal'),
      dealCurrency: z.string().optional().describe('Currency of the deal'),
      pipelineId: z.string().optional().describe('Pipeline ID'),
      pipelineTitle: z.string().optional().describe('Pipeline title'),
      stageId: z.string().optional().describe('Stage ID'),
      stageTitle: z.string().optional().describe('Stage title'),
      contactId: z.string().optional().describe('Primary contact ID'),
      contactEmail: z.string().optional().describe('Primary contact email'),
      ownerId: z.string().optional().describe('Deal owner user ID'),
      status: z.string().optional().describe('Deal status'),
      initiatedBy: z.string().optional().describe('Who initiated the action'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiUrl: ctx.config.apiUrl
      });

      let result = await client.createWebhook({
        name: 'Slates Deal Events',
        url: ctx.input.webhookBaseUrl,
        events: [...dealEventTypes],
        sources: ['public', 'admin', 'api', 'system']
      });

      return {
        registrationDetails: {
          webhookId: result.webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiUrl: ctx.config.apiUrl
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any;
      let contentType = ctx.request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = await ctx.request.json();
      } else {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      }

      let eventType = data.type || data.type || 'unknown';

      return {
        inputs: [
          {
            eventType,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload as Record<string, any>;

      let dealId = String(p['deal[id]'] || p.dealId || '');
      let dealTitle = String(p['deal[title]'] || p.dealTitle || '');
      let dealValue = String(p['deal[value]'] || p.dealValue || '');
      let dealCurrency = String(p['deal[currency]'] || p.dealCurrency || '');
      let pipelineId = String(
        p['deal[pipeline_id]'] || p['deal[group]'] || p.pipelineId || ''
      );
      let pipelineTitle = String(p['deal[pipeline_title]'] || p.pipelineTitle || '');
      let stageId = String(p['deal[stage_id]'] || p['deal[stage]'] || p.stageId || '');
      let stageTitle = String(p['deal[stage_title]'] || p.stageTitle || '');
      let contactId = String(p['deal[contact_id]'] || p['deal[contact]'] || p.contactId || '');
      let contactEmail = String(p['deal[contact_email]'] || p.contactEmail || '');
      let ownerId = String(p['deal[owner]'] || p.ownerId || '');
      let status = String(p['deal[status]'] || p.status || '');
      let initiatedBy = String(p.initiated_by || p.source || '');
      let occurredAt = String(p.date_time || p.dateTime || '');

      let uniqueId = `${ctx.input.eventType}-${dealId}-${occurredAt || Date.now()}`;

      return {
        type: `deal.${ctx.input.eventType.replace('deal_', '')}`,
        id: uniqueId,
        output: {
          dealId: dealId || undefined,
          dealTitle: dealTitle || undefined,
          dealValue: dealValue || undefined,
          dealCurrency: dealCurrency || undefined,
          pipelineId: pipelineId || undefined,
          pipelineTitle: pipelineTitle || undefined,
          stageId: stageId || undefined,
          stageTitle: stageTitle || undefined,
          contactId: contactId || undefined,
          contactEmail: contactEmail || undefined,
          ownerId: ownerId || undefined,
          status: status || undefined,
          initiatedBy: initiatedBy || undefined,
          occurredAt: occurredAt || undefined
        }
      };
    }
  })
  .build();
