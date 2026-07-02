import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

let LEAD_WEBHOOK_SETTINGS = [
  'add_lead',
  'update_lead',
  'delete_lead',
  'restore_lead',
  'status_lead',
  'responsible_lead',
  'note_lead'
];

export let leadEventsTrigger = SlateTrigger.create(spec, {
  name: 'Lead Events',
  key: 'lead_events',
  description:
    'Triggers when a lead is added, updated, deleted, restored, changes status, changes responsible user, or receives a note.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of lead event'),
      leadId: z.number().describe('Lead ID'),
      leadName: z.string().optional().describe('Lead name'),
      price: z.number().optional().describe('Lead price'),
      responsibleUserId: z.number().optional().describe('Responsible user ID'),
      statusId: z.number().optional().describe('Pipeline stage ID'),
      pipelineId: z.number().optional().describe('Pipeline ID'),
      oldStatusId: z.number().optional().describe('Previous pipeline stage ID'),
      oldPipelineId: z.number().optional().describe('Previous pipeline ID'),
      createdAt: z.number().optional().describe('Lead creation timestamp'),
      updatedAt: z.number().optional().describe('Lead update timestamp'),
      accountId: z.number().optional().describe('Account ID'),
      customFields: z.any().optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('Lead ID'),
      leadName: z.string().optional().describe('Lead name'),
      price: z.number().optional().describe('Lead price'),
      responsibleUserId: z.number().optional().describe('Responsible user ID'),
      statusId: z.number().optional().describe('Pipeline stage ID'),
      pipelineId: z.number().optional().describe('Pipeline ID'),
      oldStatusId: z.number().optional().describe('Previous pipeline stage ID'),
      oldPipelineId: z.number().optional().describe('Previous pipeline ID'),
      createdAt: z.number().optional().describe('Lead creation timestamp'),
      updatedAt: z.number().optional().describe('Lead update timestamp'),
      accountId: z.number().optional().describe('Account ID'),
      customFields: z.any().optional().describe('Custom field values')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new KommoClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let webhookUrl = ctx.input.webhookBaseUrl;
      await client.createWebhook(webhookUrl, LEAD_WEBHOOK_SETTINGS);

      return {
        registrationDetails: { destination: webhookUrl, settings: LEAD_WEBHOOK_SETTINGS }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new KommoClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      await client.deleteWebhook(ctx.input.registrationDetails.destination);
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        let jsonStr = params.get('') || text;
        body = JSON.parse(jsonStr);
      } catch {
        try {
          body = await ctx.request.json();
        } catch {
          return { inputs: [] };
        }
      }

      let inputs: any[] = [];

      let eventTypes: Record<string, string> = {
        add_lead: 'lead.added',
        update_lead: 'lead.updated',
        delete_lead: 'lead.deleted',
        restore_lead: 'lead.restored',
        status_lead: 'lead.status_changed',
        responsible_lead: 'lead.responsible_changed',
        note_lead: 'lead.note_added'
      };

      for (let [webhookKey, eventType] of Object.entries(eventTypes)) {
        let eventData = body[webhookKey];
        if (!eventData) continue;

        let items = Array.isArray(eventData) ? eventData : [eventData];
        for (let item of items) {
          inputs.push({
            eventType,
            leadId: Number(item.id),
            leadName: item.name,
            price: item.price != null ? Number(item.price) : undefined,
            responsibleUserId:
              item.responsible_user_id != null ? Number(item.responsible_user_id) : undefined,
            statusId: item.status_id != null ? Number(item.status_id) : undefined,
            pipelineId: item.pipeline_id != null ? Number(item.pipeline_id) : undefined,
            oldStatusId: item.old_status_id != null ? Number(item.old_status_id) : undefined,
            oldPipelineId:
              item.old_pipeline_id != null ? Number(item.old_pipeline_id) : undefined,
            createdAt: item.created_at != null ? Number(item.created_at) : undefined,
            updatedAt: item.updated_at != null ? Number(item.updated_at) : undefined,
            accountId: body.account_id != null ? Number(body.account_id) : undefined,
            customFields: item.custom_fields
          });
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.leadId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          leadId: ctx.input.leadId,
          leadName: ctx.input.leadName,
          price: ctx.input.price,
          responsibleUserId: ctx.input.responsibleUserId,
          statusId: ctx.input.statusId,
          pipelineId: ctx.input.pipelineId,
          oldStatusId: ctx.input.oldStatusId,
          oldPipelineId: ctx.input.oldPipelineId,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          accountId: ctx.input.accountId,
          customFields: ctx.input.customFields
        }
      };
    }
  })
  .build();
