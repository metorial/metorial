import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let callCompleted = SlateTrigger.create(spec, {
  name: 'Call Completed',
  key: 'call_completed',
  description:
    'Fires when a call has been completed. Can be filtered by call direction, call status, lead status, and team or number.'
})
  .input(
    z.object({
      callId: z.string().describe('ID of the completed call'),
      direction: z.string().optional().describe('Call direction: inbound or outbound'),
      status: z.string().optional().describe('Call status: completed, missed, or offline'),
      leadStatus: z
        .string()
        .optional()
        .describe('Lead status: contacted, missed, removed, or voicemail'),
      duration: z.number().optional().describe('Call duration in seconds'),
      recordingUrl: z.string().optional().describe('URL to the call recording'),
      lead: z
        .record(z.string(), z.any())
        .optional()
        .describe('Lead data from the webhook payload'),
      agent: z
        .record(z.string(), z.any())
        .optional()
        .describe('Agent data from the webhook payload'),
      raw: z.record(z.string(), z.any()).optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('ID of the completed call'),
      direction: z.string().optional().describe('Call direction'),
      status: z.string().optional().describe('Call status'),
      leadStatus: z.string().optional().describe('Lead status after the call'),
      duration: z.number().optional().describe('Duration in seconds'),
      durationFormatted: z.string().optional().describe('Human-readable duration'),
      recordingUrl: z.string().optional().describe('URL to recording'),
      transcript: z.string().optional().describe('Call transcript if available'),
      leadId: z.string().optional().describe('Associated lead ID'),
      leadFirstName: z.string().optional().describe('Lead first name'),
      leadLastName: z.string().optional().describe('Lead last name'),
      leadPhoneNumber: z.string().optional().describe('Lead phone number'),
      leadEmail: z.string().optional().describe('Lead email'),
      agentId: z.string().optional().describe('Agent who handled the call'),
      agentName: z.string().optional().describe('Agent name'),
      startedAt: z.string().optional().describe('When the call started'),
      source: z.string().optional().describe('Lead source')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountId: ctx.config.accountId
      });

      let result = await client.createWebhook({
        name: 'Slates - Call Completed',
        event: 'call_completed',
        targetUrl: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          webhookId: String(result.id)
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountId: ctx.config.accountId
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            callId: String(data.id ?? data.call_id ?? ''),
            direction: data.direction,
            status: data.status,
            leadStatus: data.lead_status,
            duration: data.seconds ?? data.duration,
            recordingUrl: data.recording_url,
            lead: data.lead,
            agent: data.member ?? data.user,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let lead = ctx.input.lead ?? {};
      let agent = ctx.input.agent ?? {};

      return {
        type: 'call.completed',
        id: ctx.input.callId,
        output: {
          callId: ctx.input.callId,
          direction: ctx.input.direction,
          status: ctx.input.status,
          leadStatus: ctx.input.leadStatus,
          duration: ctx.input.duration,
          durationFormatted: ctx.input.raw?.time_formatted,
          recordingUrl: ctx.input.recordingUrl,
          transcript: ctx.input.raw?.transcript,
          leadId: lead.id ? String(lead.id) : undefined,
          leadFirstName: lead.fname,
          leadLastName: lead.lname,
          leadPhoneNumber: lead.phone_number,
          leadEmail: lead.email,
          agentId: agent.id ? String(agent.id) : undefined,
          agentName:
            agent.name ?? (`${agent.fname ?? ''} ${agent.lname ?? ''}`.trim() || undefined),
          startedAt: ctx.input.raw?.started_at,
          source: ctx.input.raw?.source
        }
      };
    }
  })
  .build();
