import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let callEventTypes = [
  'call.created',
  'call.ringing_on_agent',
  'call.agent_declined',
  'call.answered',
  'call.transferred',
  'call.unsuccessful_transfer',
  'call.hungup',
  'call.ended',
  'call.voicemail_left',
  'call.assigned',
  'call.archived',
  'call.tagged',
  'call.untagged',
  'call.commented'
] as const;

export let callEvents = SlateTrigger.create(spec, {
  name: 'Call Events',
  key: 'call_events',
  description:
    'Triggers when call events occur including creation, ringing, answered, transferred, ended, voicemail, tagged, commented, and archived events.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of call event'),
      timestamp: z.number().describe('Event timestamp as UNIX timestamp'),
      webhookToken: z.string().describe('Webhook verification token'),
      call: z.any().describe('The call data from the event payload')
    })
  )
  .output(
    z.object({
      callId: z.number().describe('Unique call identifier'),
      direction: z.string().describe('Call direction (inbound or outbound)'),
      status: z.string().describe('Call status'),
      rawDigits: z.string().describe('Phone number in E.164 format or "anonymous"'),
      startedAt: z.number().nullable().describe('Call start time as UNIX timestamp'),
      answeredAt: z.number().nullable().describe('Call answer time as UNIX timestamp'),
      endedAt: z.number().nullable().describe('Call end time as UNIX timestamp'),
      duration: z.number().nullable().describe('Call duration in seconds'),
      recording: z.string().nullable().describe('Recording URL (valid for 10 minutes)'),
      voicemail: z.string().nullable().describe('Voicemail URL (valid for 10 minutes)'),
      archived: z.boolean().describe('Whether the call is archived'),
      missedCallReason: z.string().nullable().describe('Reason the call was missed'),
      userName: z.string().nullable().describe('Name of the user who handled the call'),
      userEmail: z.string().nullable().describe('Email of the user who handled the call'),
      numberDigits: z.string().nullable().describe('Aircall number used'),
      tags: z
        .array(
          z.object({
            tagId: z.number(),
            tagName: z.string()
          })
        )
        .describe('Tags applied to the call'),
      comments: z
        .array(
          z.object({
            commentId: z.number(),
            content: z.string()
          })
        )
        .describe('Comments on the call')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let webhook = await client.createWebhook(
        ctx.input.webhookBaseUrl,
        [...callEventTypes],
        'slates-call-events'
      );
      return {
        registrationDetails: {
          webhookId: webhook.webhook_id,
          token: webhook.token
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.resource !== 'call') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.event,
            timestamp: data.timestamp,
            webhookToken: data.token || '',
            call: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let call = ctx.input.call;

      return {
        type: ctx.input.eventType,
        id: `${call.id}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output: {
          callId: call.id,
          direction: call.direction || '',
          status: call.status || '',
          rawDigits: call.raw_digits || '',
          startedAt: call.started_at ?? null,
          answeredAt: call.answered_at ?? null,
          endedAt: call.ended_at ?? null,
          duration: call.duration ?? null,
          recording: call.recording ?? null,
          voicemail: call.voicemail ?? null,
          archived: call.archived ?? false,
          missedCallReason: call.missed_call_reason ?? null,
          userName: call.user?.name ?? null,
          userEmail: call.user?.email ?? null,
          numberDigits: call.number?.digits ?? null,
          tags: (call.tags || []).map((t: any) => ({
            tagId: t.id,
            tagName: t.name
          })),
          comments: (call.comments || []).map((c: any) => ({
            commentId: c.id,
            content: c.content
          }))
        }
      };
    }
  })
  .build();
