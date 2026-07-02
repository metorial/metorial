import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let interactionWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Interaction Events',
  key: 'interaction_webhook',
  description:
    'Receives Flex Interaction webhook events including interaction creation, channel status changes, participant joins/leaves, and channel creation failures. Configure the webhook URL in the Flex Console or via the InteractionWebhooks API.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Event type (e.g., interaction.created, channel.created, channel.updated, participant.added, participant.left)'
        ),
      eventSid: z.string().describe('Unique event identifier'),
      interactionSid: z.string().optional().describe('Interaction SID'),
      channelSid: z.string().optional().describe('Channel SID'),
      channelType: z.string().optional().describe('Channel type'),
      channelStatus: z.string().optional().describe('Channel status'),
      participantSid: z.string().optional().describe('Participant SID'),
      participantType: z.string().optional().describe('Participant type'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.record(z.string(), z.any()).optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Event type'),
      interactionSid: z.string().optional().describe('Interaction SID'),
      channelSid: z.string().optional().describe('Channel SID'),
      channelType: z.string().optional().describe('Channel type'),
      channelStatus: z.string().optional().describe('Channel status'),
      participantSid: z.string().optional().describe('Participant SID'),
      participantType: z.string().optional().describe('Participant type'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: Record<string, any>;

      try {
        let contentType = ctx.request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = (await ctx.request.json()) as Record<string, any>;
        } else {
          let body = await ctx.request.text();
          data = {};
          for (let pair of body.split('&')) {
            let [key, value] = pair.split('=');
            if (key && value !== undefined) {
              data[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
            }
          }
        }
      } catch {
        return { inputs: [] };
      }

      let eventType = data.EventType || data.event_type || data.Type || 'unknown';
      let eventSid = data.Sid || data.sid || `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventSid,
            interactionSid: data.InteractionSid || data.interaction_sid,
            channelSid: data.ChannelSid || data.channel_sid,
            channelType: data.ChannelType || data.channel_type,
            channelStatus: data.ChannelStatus || data.channel_status || data.Status,
            participantSid: data.ParticipantSid || data.participant_sid,
            participantType: data.ParticipantType || data.participant_type,
            timestamp: data.Timestamp || data.timestamp || new Date().toISOString(),
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventSid,
        output: {
          eventType: ctx.input.eventType,
          interactionSid: ctx.input.interactionSid,
          channelSid: ctx.input.channelSid,
          channelType: ctx.input.channelType,
          channelStatus: ctx.input.channelStatus,
          participantSid: ctx.input.participantSid,
          participantType: ctx.input.participantType,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
