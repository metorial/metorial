import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let leadEvents = SlateTrigger.create(spec, {
  name: 'Lead Events',
  key: 'lead_events',
  description:
    'Triggers when a lead is created or updated. Configure the webhook URL in RepairShopr under Admin > Notification Center.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of lead event'),
      leadId: z.number().describe('Lead ID'),
      webhookPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('Lead ID'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      fullname: z.string().optional().describe('Full name'),
      businessName: z.string().optional().describe('Business name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      status: z.string().optional().describe('Lead status'),
      notes: z.string().optional().describe('Lead notes'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body) return { inputs: [] };

      let lead = body.lead || body;
      let leadId = lead.id || lead.lead_id;
      if (!leadId) return { inputs: [] };

      let eventType = body.type || body.event || body.action || 'updated';

      return {
        inputs: [
          {
            eventType: String(eventType),
            leadId: Number(leadId),
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let lead = ctx.input.webhookPayload?.lead || ctx.input.webhookPayload || {};
      let eventType = ctx.input.eventType.toLowerCase().replace(/\s+/g, '_');

      if (eventType.includes('creat') || eventType.includes('new')) {
        eventType = 'created';
      } else {
        eventType = 'updated';
      }

      return {
        type: `lead.${eventType}`,
        id: `lead_${ctx.input.leadId}_${eventType}_${lead.updated_at || Date.now()}`,
        output: {
          leadId: ctx.input.leadId,
          firstname: lead.firstname,
          lastname: lead.lastname,
          fullname: lead.fullname,
          businessName: lead.business_name,
          email: lead.email,
          phone: lead.phone,
          status: lead.status,
          notes: lead.notes,
          createdAt: lead.created_at,
          updatedAt: lead.updated_at
        }
      };
    }
  })
  .build();
