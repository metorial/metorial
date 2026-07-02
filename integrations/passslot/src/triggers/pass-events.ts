import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let passEvents = SlateTrigger.create(spec, {
  name: 'Pass Events',
  key: 'pass_events',
  description:
    'Triggers when a pass is created, updated, or downloaded. Configure the webhook URL in the PassSlot dashboard webhooks section.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated', 'downloaded']).describe('Type of pass event'),
      eventId: z.string().describe('Unique event identifier'),
      serialNumber: z.string().describe('Pass serial number'),
      passTypeIdentifier: z.string().describe('Pass type identifier'),
      templateId: z.number().optional().describe('Template ID the pass was generated from'),
      distributionUrl: z.string().optional().describe('Distribution URL for the pass')
    })
  )
  .output(
    z.object({
      serialNumber: z.string().describe('Pass serial number'),
      passTypeIdentifier: z.string().describe('Pass type identifier'),
      templateId: z.number().optional().describe('Template ID the pass was generated from'),
      distributionUrl: z.string().optional().describe('Distribution URL for the pass')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType: 'created' | 'updated' | 'downloaded';
      let rawType = body.type || body.event;
      if (rawType === 'pass.created') {
        eventType = 'created';
      } else if (rawType === 'pass.updated') {
        eventType = 'updated';
      } else if (rawType === 'pass.downloaded') {
        eventType = 'downloaded';
      } else {
        return { inputs: [] };
      }

      let passData = body.data || body;

      return {
        inputs: [
          {
            eventType,
            eventId:
              body.id ||
              `${rawType}_${passData.serialNumber || passData.serial_number}_${Date.now()}`,
            serialNumber: passData.serialNumber || passData.serial_number || '',
            passTypeIdentifier:
              passData.passTypeIdentifier || passData.pass_type_identifier || '',
            templateId: passData.templateId || passData.template_id,
            distributionUrl: passData.url || passData.distributionUrl
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `pass.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          serialNumber: ctx.input.serialNumber,
          passTypeIdentifier: ctx.input.passTypeIdentifier,
          templateId: ctx.input.templateId,
          distributionUrl: ctx.input.distributionUrl
        }
      };
    }
  })
  .build();
