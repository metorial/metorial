import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let voiceAgentCall = SlateTrigger.create(spec, {
  name: 'Voice Agent Call',
  key: 'voice_agent_call',
  description:
    'Triggered when a Voice Agent (ElevenAgents) call completes, fails to initiate, or when post-call audio is available. Covers post-call transcription, post-call audio, and call initiation failure events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the webhook event'),
      eventId: z.string().describe('Unique event identifier'),
      conversationId: z.string().optional().describe('Conversation ID'),
      agentId: z.string().optional().describe('Agent ID'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      conversationId: z.string().optional().describe('Unique conversation identifier'),
      agentId: z.string().optional().describe('ID of the voice agent'),
      status: z.string().optional().describe('Call status or outcome'),
      transcript: z
        .array(
          z.object({
            role: z.string().optional().describe('Speaker role (agent or user)'),
            message: z.string().optional().describe('Spoken message text'),
            timestamp: z.number().optional().describe('Message timestamp')
          })
        )
        .optional()
        .describe('Conversation transcript'),
      analysis: z.any().optional().describe('Post-call analysis results'),
      audioBase64: z
        .string()
        .optional()
        .describe('Base64-encoded call audio (for post_call_audio events)'),
      errorMessage: z
        .string()
        .optional()
        .describe('Error message for failed call initiations'),
      metadata: z.any().optional().describe('Additional event metadata')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ElevenLabsClient(ctx.auth.token);

      let result = await client.createWebhook({
        name: 'Slates Voice Agent Webhook',
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
      let conversationId = (data.conversation_id ||
        (data.data && (data.data as Record<string, unknown>).conversation_id)) as
        | string
        | undefined;
      let agentId = (data.agent_id ||
        (data.data && (data.data as Record<string, unknown>).agent_id)) as string | undefined;

      let eventId = conversationId
        ? `${eventType}_${conversationId}`
        : `${eventType}_${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            conversationId,
            agentId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload as Record<string, unknown>;
      let innerData = (payload.data || payload) as Record<string, unknown>;

      let transcript: Record<string, unknown>[] | undefined;
      if (innerData.transcript && Array.isArray(innerData.transcript)) {
        transcript = (innerData.transcript as Record<string, unknown>[]).map(t => ({
          role: t.role as string | undefined,
          message: (t.message || t.text) as string | undefined,
          timestamp: t.timestamp as number | undefined
        }));
      }

      return {
        type: `voice_agent.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          conversationId: ctx.input.conversationId,
          agentId: ctx.input.agentId,
          status: innerData.status as string | undefined,
          transcript,
          analysis: innerData.analysis,
          audioBase64: innerData.audio as string | undefined,
          errorMessage:
            (innerData.error as string | undefined) ||
            (innerData.error_message as string | undefined),
          metadata: innerData.metadata
        }
      };
    }
  })
  .build();
