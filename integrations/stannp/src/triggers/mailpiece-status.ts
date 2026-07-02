import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let mailpieceStatus = SlateTrigger.create(spec, {
  name: 'Mailpiece Status Changed',
  key: 'mailpiece_status_changed',
  description:
    'Triggers whenever an individual mailpiece status changes (printing, dispatched, cancelled, local_delivery, delivered, returned).'
})
  .input(
    z.object({
      webhookId: z.number().optional().describe('Webhook ID'),
      event: z.string().describe('Event type'),
      created: z.string().optional().describe('Event creation timestamp'),
      retries: z.string().optional().describe('Number of retry attempts'),
      mailpieces: z
        .array(z.any())
        .optional()
        .describe('Array of mailpiece objects that triggered the event')
    })
  )
  .output(
    z.object({
      mailpieceId: z.string().describe('Mailpiece ID'),
      status: z
        .string()
        .describe(
          'New mailpiece status (printing, dispatched, cancelled, local_delivery, delivered, returned)'
        ),
      type: z.string().optional().describe('Mailpiece type (e.g. postcard, letter)'),
      format: z.string().optional().describe('Mailpiece format/size'),
      pdfUrl: z.string().optional().describe('PDF URL'),
      dispatched: z.string().optional().describe('Dispatch timestamp'),
      country: z.string().optional().describe('Destination country'),
      cost: z.string().optional().describe('Mailpiece cost'),
      tags: z.string().optional().describe('Associated tags'),
      timestamp: z.string().optional().describe('Mailpiece creation timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.event === 'test_url') {
        return { inputs: [] };
      }

      let mailpieces: any[] = data.mailpieces || data.data || [];
      if (!Array.isArray(mailpieces)) {
        mailpieces = [mailpieces];
      }

      return {
        inputs: mailpieces.map((mailpiece: any) => ({
          webhookId: data.webhook_id,
          event: data.event || 'mailpiece_status',
          created: data.created,
          retries: data.retries,
          mailpieces: [mailpiece]
        }))
      };
    },

    handleEvent: async ctx => {
      let mailpiece = ctx.input.mailpieces?.[0];
      let status = mailpiece?.status || ctx.input.event;

      return {
        type: `mailpiece.${status}`,
        id: `mailpiece-${mailpiece?.id || 'unknown'}-${ctx.input.created || Date.now()}`,
        output: {
          mailpieceId: String(mailpiece?.id || ''),
          status: status,
          type: mailpiece?.type,
          format: mailpiece?.format,
          pdfUrl: mailpiece?.pdf_file,
          dispatched: mailpiece?.dispatched,
          country: mailpiece?.country,
          cost: mailpiece?.cost,
          tags: mailpiece?.tags,
          timestamp: mailpiece?.timestamp
        }
      };
    }
  })
  .build();
