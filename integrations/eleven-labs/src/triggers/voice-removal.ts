import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let voiceRemoval = SlateTrigger.create(spec, {
  name: 'Voice Removal',
  key: 'voice_removal',
  description:
    'Triggered when a shared voice is scheduled for removal, when a removal notice is withdrawn, or when a voice is actually removed and no longer usable.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type (scheduled, withdrawn, removed)'),
      eventId: z.string().describe('Unique event identifier'),
      voiceId: z.string().optional().describe('Voice ID affected'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      voiceId: z.string().optional().describe('ID of the affected voice'),
      voiceName: z.string().optional().describe('Name of the affected voice'),
      removalStatus: z
        .string()
        .optional()
        .describe('Removal status: scheduled, withdrawn, or removed'),
      removalDate: z.string().optional().describe('Scheduled removal date if applicable'),
      reason: z.string().optional().describe('Reason for the removal')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ElevenLabsClient(ctx.auth.token);

      let result = await client.createWebhook({
        name: 'Slates Voice Removal Webhook',
        webhookUrl: ctx.input.webhookBaseUrl
      });

      let data = result as Record<string, unknown>;

      return {
        registrationDetails: {
          webhookId: data.webhook_id as string,
          webhookSecret: data.webhook_secret as string | undefined
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ElevenLabsClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data: Record<string, unknown>;
      try {
        data = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return { inputs: [] };
      }

      let eventType = (data.type || data.event_type || 'unknown') as string;
      let innerData = (data.data || data) as Record<string, unknown>;
      let voiceId = (innerData.voice_id || data.voice_id) as string | undefined;
      let eventId = voiceId
        ? `voice_removal_${eventType}_${voiceId}`
        : `voice_removal_${eventType}_${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            voiceId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload as Record<string, unknown>;
      let innerData = (payload.data || payload) as Record<string, unknown>;

      let removalStatus = 'unknown';
      let eventType = ctx.input.eventType.toLowerCase();
      if (eventType.includes('scheduled') || eventType.includes('notice')) {
        removalStatus = 'scheduled';
      } else if (eventType.includes('withdrawn')) {
        removalStatus = 'withdrawn';
      } else if (eventType.includes('removed')) {
        removalStatus = 'removed';
      }

      return {
        type: `voice.removal_${removalStatus}`,
        id: ctx.input.eventId,
        output: {
          voiceId: ctx.input.voiceId,
          voiceName:
            (innerData.voice_name as string | undefined) ||
            (innerData.name as string | undefined),
          removalStatus,
          removalDate: innerData.removal_date as string | undefined,
          reason: innerData.reason as string | undefined
        }
      };
    }
  })
  .build();
