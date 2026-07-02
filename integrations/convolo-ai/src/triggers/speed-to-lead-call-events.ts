import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let leadSchema = z
  .object({
    leadPhone: z.string().optional().describe('Lead phone number'),
    leadId: z.string().optional().describe('Lead identifier'),
    source: z.string().optional().describe('Lead source URL or path'),
    sitePath: z.string().optional().describe('Site path where lead was captured'),
    referer: z.string().optional().describe('Referrer URL'),
    ipAddress: z.string().optional().describe('Lead IP address'),
    country: z.string().optional().describe('Lead country'),
    customParams: z
      .record(z.string(), z.any())
      .optional()
      .describe('Custom parameters attached to the lead')
  })
  .describe('Lead information');

let agentSchema = z
  .object({
    agentId: z.string().optional().describe('Agent identifier'),
    agentPhone: z.string().optional().describe('Agent phone number'),
    agentName: z.string().optional().describe('Agent name'),
    agentEmail: z.string().optional().describe('Agent email')
  })
  .describe('Agent information');

export let speedToLeadCallEvents = SlateTrigger.create(spec, {
  name: 'Speed To Lead Call Events',
  key: 'speed_to_lead_call_events',
  description:
    'Triggers when a Speed To Lead call starts or ends. Receives webhook notifications for call initiation (start_call) and call completion (end_call) events. Webhooks must be configured in the Convolo dashboard under Convolo Leads > Widgets > Settings > Integrations tab.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type: start_call or end_call'),
      callId: z.string().optional().describe('Unique call identifier'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      callId: z.string().optional().describe('Unique call identifier'),
      userId: z.string().optional().describe('User identifier'),
      widgetKey: z.string().optional().describe('Widget key'),
      widgetName: z.string().optional().describe('Widget name'),
      callStatus: z.string().optional().describe('Call status (e.g., answered, no_answer)'),
      isDelayedCall: z.boolean().optional().describe('Whether this was a delayed call'),
      timezone: z.string().optional().describe('Call timezone'),
      timeStarted: z.string().optional().describe('ISO timestamp when call started'),
      timeAgentAnswered: z.string().optional().describe('ISO timestamp when agent answered'),
      timeLeadAnswered: z.string().optional().describe('ISO timestamp when lead answered'),
      timeEnded: z.string().optional().describe('ISO timestamp when call ended'),
      answerDurationSec: z.number().optional().describe('Duration until answer in seconds'),
      leadAnswerDurationSec: z
        .number()
        .optional()
        .describe('Duration until lead answered in seconds'),
      talkDurationSec: z.number().optional().describe('Talk duration in seconds'),
      totalDurationSec: z.number().optional().describe('Total call duration in seconds'),
      disconnectedBy: z.string().optional().describe('Who disconnected the call'),
      recordingLink: z.string().optional().describe('URL to the call recording'),
      agent: agentSchema.optional(),
      lead: leadSchema.optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let eventType = data.type || data.event_type || 'unknown';
      let callId = data.call_id || data.callId || `stl-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            callId: String(callId),
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload;
      let eventType = ctx.input.eventType;

      let lead = payload.lead || {};
      let agent = payload.agent || {};

      return {
        type: `call.${eventType}`,
        id: ctx.input.callId || `stl-${Date.now()}`,
        output: {
          callId: payload.call_id,
          userId: payload.user_id,
          widgetKey: payload.widget_key,
          widgetName: payload.widget_name,
          callStatus: payload.call_status,
          isDelayedCall: payload.is_delayed_call,
          timezone: payload.timezone,
          timeStarted: payload.time_started_iso_string,
          timeAgentAnswered: payload.time_agent_answered_iso_string,
          timeLeadAnswered: payload.time_lead_answered_iso_string,
          timeEnded: payload.time_ended_iso_string,
          answerDurationSec: payload.answer_duration_sec,
          leadAnswerDurationSec: payload.lead_answer_duration_sec,
          talkDurationSec: payload.talk_duration_sec,
          totalDurationSec: payload.total_duration_sec,
          disconnectedBy: payload.disconnected_by,
          recordingLink: payload.recording_link,
          agent: agent
            ? {
                agentId: agent.id,
                agentPhone: agent.phone,
                agentName: agent.name,
                agentEmail: agent.email
              }
            : undefined,
          lead: lead
            ? {
                leadPhone: lead.phone || lead.lead_phone,
                leadId: lead.lead_id,
                source: lead.source,
                sitePath: lead.site_path,
                referer: lead.referer,
                ipAddress: lead.ip_address,
                country: lead.country,
                customParams: lead.custom_params
              }
            : undefined
        }
      };
    }
  })
  .build();
