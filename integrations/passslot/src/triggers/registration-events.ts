import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let registrationEvents = SlateTrigger.create(spec, {
  name: 'Registration Events',
  key: 'registration_events',
  description:
    'Triggers when a device registers or unregisters for push notifications for a pass (pass added to or removed from Apple Wallet). Configure the webhook URL in the PassSlot dashboard webhooks section.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'deleted']).describe('Type of registration event'),
      eventId: z.string().describe('Unique event identifier'),
      deviceLibraryIdentifier: z.string().describe('Device library identifier'),
      serialNumber: z.string().describe('Pass serial number'),
      passTypeIdentifier: z.string().describe('Pass type identifier'),
      templateId: z.number().optional().describe('Template ID')
    })
  )
  .output(
    z.object({
      deviceLibraryIdentifier: z.string().describe('Device library identifier'),
      serialNumber: z.string().describe('Pass serial number'),
      passTypeIdentifier: z.string().describe('Pass type identifier'),
      templateId: z.number().optional().describe('Template ID')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType: 'created' | 'deleted';
      let rawType = body.type || body.event;
      if (rawType === 'registration.created') {
        eventType = 'created';
      } else if (rawType === 'registration.deleted') {
        eventType = 'deleted';
      } else {
        return { inputs: [] };
      }

      let data = body.data || body;

      return {
        inputs: [
          {
            eventType,
            eventId:
              body.id ||
              `${rawType}_${data.deviceLibraryIdentifier || data.device_library_identifier}_${data.serialNumber || data.serial_number}_${Date.now()}`,
            deviceLibraryIdentifier:
              data.deviceLibraryIdentifier || data.device_library_identifier || '',
            serialNumber: data.serialNumber || data.serial_number || '',
            passTypeIdentifier: data.passTypeIdentifier || data.pass_type_identifier || '',
            templateId: data.templateId || data.template_id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `registration.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          deviceLibraryIdentifier: ctx.input.deviceLibraryIdentifier,
          serialNumber: ctx.input.serialNumber,
          passTypeIdentifier: ctx.input.passTypeIdentifier,
          templateId: ctx.input.templateId
        }
      };
    }
  })
  .build();
