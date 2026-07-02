import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let voiceEventsTrigger = SlateTrigger.create(spec, {
  name: 'Voice Events',
  key: 'voice_events',
  description:
    'Triggered when a shared voice from the voice library is scheduled for removal, when a removal notice is withdrawn, or when a voice is permanently removed. Configure the webhook URL in your ElevenLabs workspace settings.',
  instructions: [
    'Set up the webhook URL in your ElevenLabs workspace settings.',
    'Covers three event types: voice removal notice, notice withdrawn, and voice removed.'
  ]
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of voice event (removal_notice, removal_notice_withdrawn, removed)'),
      eventId: z.string().describe('Unique event identifier'),
      voiceId: z.string().optional().describe('ID of the affected voice'),
      voiceName: z.string().optional().describe('Name of the affected voice'),
      scheduledRemovalDate: z
        .string()
        .optional()
        .describe('Scheduled removal date for the voice'),
      rawPayload: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      voiceId: z.string().optional().describe('ID of the affected voice'),
      voiceName: z.string().optional().describe('Name of the affected voice'),
      scheduledRemovalDate: z.string().optional().describe('Scheduled removal date')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.type || body.event_type || 'voice.unknown';
      let eventId =
        body.event_id || body.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      let normalizedType = eventType;
      if (
        eventType.includes('removal_notice_withdrawn') ||
        eventType.includes('removal_cancelled')
      ) {
        normalizedType = 'removal_notice_withdrawn';
      } else if (
        eventType.includes('removal_notice') ||
        eventType.includes('removal_scheduled')
      ) {
        normalizedType = 'removal_notice';
      } else if (eventType.includes('removed')) {
        normalizedType = 'removed';
      }

      return {
        inputs: [
          {
            eventType: normalizedType,
            eventId,
            voiceId: body.voice_id || body.data?.voice_id,
            voiceName: body.voice_name || body.data?.voice_name,
            scheduledRemovalDate:
              body.scheduled_removal_date || body.data?.scheduled_removal_date,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `voice.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          voiceId: ctx.input.voiceId,
          voiceName: ctx.input.voiceName,
          scheduledRemovalDate: ctx.input.scheduledRemovalDate
        }
      };
    }
  })
  .build();
