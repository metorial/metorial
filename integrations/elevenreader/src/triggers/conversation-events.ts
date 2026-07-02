import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let conversationEventsTrigger = SlateTrigger.create(spec, {
  name: 'Conversation Events',
  key: 'conversation_events',
  description:
    'Triggered when a conversational AI agent call completes, including post-call transcription, audio, and call initiation failures. Configure the webhook URL in your ElevenLabs workspace settings.',
  instructions: [
    'Set up the webhook URL in your ElevenLabs workspace settings under the webhooks section.',
    'Webhook requests are authenticated via HMAC signatures. Configure the shared secret in workspace settings.'
  ]
})
  .input(
    z.object({
      eventType: z.string().describe('Type of conversation event'),
      eventId: z.string().describe('Unique event identifier'),
      conversationId: z.string().optional().describe('ID of the conversation'),
      agentId: z.string().optional().describe('ID of the conversational AI agent'),
      status: z.string().optional().describe('Status of the call'),
      transcript: z.any().optional().describe('Full conversation transcript'),
      analysis: z.any().optional().describe('Call analysis results'),
      metadata: z.any().optional().describe('Additional event metadata'),
      audioBase64: z
        .string()
        .optional()
        .describe('Base64-encoded MP3 of the conversation (audio webhook only)'),
      errorMessage: z
        .string()
        .optional()
        .describe('Error message for call initiation failures')
    })
  )
  .output(
    z.object({
      conversationId: z.string().optional().describe('ID of the conversation'),
      agentId: z.string().optional().describe('ID of the agent'),
      status: z.string().optional().describe('Call status'),
      transcript: z.any().optional().describe('Conversation transcript'),
      analysis: z.any().optional().describe('Call analysis results'),
      metadata: z.any().optional().describe('Event metadata'),
      audioBase64: z.string().optional().describe('Base64-encoded conversation audio'),
      errorMessage: z.string().optional().describe('Error message for failures')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.type || body.event_type || 'conversation.completed';
      let eventId =
        body.event_id ||
        body.conversation_id ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            conversationId: body.conversation_id || body.data?.conversation_id,
            agentId: body.agent_id || body.data?.agent_id,
            status: body.status || body.data?.status,
            transcript: body.transcript || body.data?.transcript,
            analysis: body.analysis || body.data?.analysis,
            metadata: body.metadata || body.data?.metadata,
            audioBase64: body.audio_base_64 || body.data?.audio_base_64,
            errorMessage: body.error || body.data?.error
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `conversation.${ctx.input.eventType.replace(/^conversation\./, '')}`,
        id: ctx.input.eventId,
        output: {
          conversationId: ctx.input.conversationId,
          agentId: ctx.input.agentId,
          status: ctx.input.status,
          transcript: ctx.input.transcript,
          analysis: ctx.input.analysis,
          metadata: ctx.input.metadata,
          audioBase64: ctx.input.audioBase64,
          errorMessage: ctx.input.errorMessage
        }
      };
    }
  })
  .build();
