import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let leadCollected = SlateTrigger.create(spec, {
  name: 'Lead Collected',
  key: 'lead_collected',
  description:
    'Fires when new leads are collected through lead generation forms embedded in flipbooks. The webhook must be configured manually in the Heyzine account settings at https://heyzine.com/account/#scripts.'
})
  .input(
    z.object({
      leadId: z.string().describe('Unique identifier for the lead event.'),
      flipbookId: z
        .string()
        .describe('Identifier of the flipbook where the lead was collected.'),
      flipbookTitle: z.string().describe('Title of the flipbook.'),
      collectedAt: z.string().describe('Date when the lead was collected.'),
      fields: z
        .array(
          z.object({
            label: z.string().describe('Field label from the form.'),
            value: z.string().describe('Value entered by the lead.')
          })
        )
        .describe('Form responses from the lead.')
    })
  )
  .output(
    z.object({
      flipbookId: z
        .string()
        .describe('Identifier of the flipbook where the lead was collected.'),
      flipbookTitle: z.string().describe('Title of the flipbook.'),
      collectedAt: z.string().describe('Date when the lead was collected.'),
      fields: z
        .array(
          z.object({
            label: z.string().describe('Field label from the form.'),
            value: z.string().describe('Value entered by the lead.')
          })
        )
        .describe('Form responses from the lead.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Heyzine may batch multiple leads in a single webhook call
      let leads: any[] = Array.isArray(body) ? body : body.leads || [body];

      let inputs = leads.map((lead: any, index: number) => {
        let fields = (lead.fields || lead.responses || []).map((f: any) => ({
          label: f.label || f.field || '',
          value: f.value || ''
        }));

        let flipbookId = lead.flipbook_id || lead.flipbookId || lead.flipbook?.id || '';
        let flipbookTitle =
          lead.flipbook_title || lead.flipbookTitle || lead.flipbook?.title || '';
        let collectedAt =
          lead.date || lead.collected_at || lead.createdAt || new Date().toISOString();
        let leadId = lead.id || `${flipbookId}-${collectedAt}-${index}`;

        return {
          leadId,
          flipbookId,
          flipbookTitle,
          collectedAt,
          fields
        };
      });

      return {
        inputs
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'lead.collected',
        id: ctx.input.leadId,
        output: {
          flipbookId: ctx.input.flipbookId,
          flipbookTitle: ctx.input.flipbookTitle,
          collectedAt: ctx.input.collectedAt,
          fields: ctx.input.fields
        }
      };
    }
  })
  .build();
