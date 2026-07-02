import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let dialerCallEvents = SlateTrigger.create(spec, {
  name: 'Dialer Call Events',
  key: 'dialer_call_events',
  description:
    'Triggers on Power Dialer call lifecycle events: callStarted, callRinging, callAnswered, callEnded, and webphoneSummary. Webhooks must be configured in the Brightcall Dialer dashboard. All event types are sent to the webhook endpoint and filtered by event type.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Event type: callStarted, callRinging, callAnswered, callEnded, or webphoneSummary'
        ),
      callId: z.string().optional().describe('Unique call identifier'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      callId: z.string().optional().describe('Unique call identifier'),
      uniqueId: z.string().optional().describe('Unique external call ID'),
      eventType: z.string().describe('The type of event that occurred'),
      fromNumber: z.string().optional().describe('Caller phone number'),
      toNumber: z.string().optional().describe('Callee phone number'),
      clientNumber: z.string().optional().describe('Client phone number'),
      callType: z.number().optional().describe('Call type: 0=inbound, 1=outbound, 2=internal'),
      callState: z
        .number()
        .optional()
        .describe('Call state: 0=unanswered, 1=answered, 2=failed'),
      talkTime: z.number().optional().describe('Talk duration in seconds'),
      totalTime: z.number().optional().describe('Total call duration in seconds'),
      answerTime: z.number().optional().describe('Time to answer in seconds'),
      agentId: z.string().optional().describe('Agent user ID'),
      agentName: z.string().optional().describe('Agent name'),
      agentShortNumber: z.string().optional().describe('Agent short/extension number'),
      projectName: z.string().optional().describe('Associated project name'),
      projectId: z.string().optional().describe('Associated project ID'),
      outcomeTag: z.string().optional().describe('Call outcome tag selected by agent'),
      outcomeType: z.string().optional().describe('Call outcome type'),
      aiSummary: z.string().optional().describe('AI-generated call summary'),
      aiTranscript: z.string().optional().describe('AI-generated call transcript'),
      recordingLink: z.string().optional().describe('URL to the call recording'),
      crmContactFields: z
        .array(
          z.object({
            title: z.string().optional(),
            value: z.string().optional(),
            isWebsite: z.boolean().optional()
          })
        )
        .optional()
        .describe('CRM contact data fields'),
      additionalData: z
        .any()
        .optional()
        .describe('Additional data from the webhook configuration')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;

      let contentType = ctx.request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await ctx.request.json();
      } else {
        let text = await ctx.request.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { rawText: text };
        }
      }

      let eventType = data.eventType || data.event_type || 'unknown';

      let url = new URL(ctx.request.url);
      let pathSegments = url.pathname.split('/').filter(Boolean);
      let lastSegment = pathSegments[pathSegments.length - 1];
      if (
        lastSegment &&
        [
          'callStarted',
          'callRinging',
          'callAnswered',
          'callEnded',
          'webphoneSummary'
        ].includes(lastSegment)
      ) {
        eventType = lastSegment;
      }

      let callId =
        data.callId || data.call_id || data.id || data.uniqueId || `dialer-${Date.now()}`;

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

      let crmContactFields:
        | Array<{ title?: string; value?: string; isWebsite?: boolean }>
        | undefined;
      if (payload.contact?.fields) {
        crmContactFields = payload.contact.fields;
      } else if (payload.crmInfo?.fields) {
        crmContactFields = payload.crmInfo.fields;
      }

      return {
        type: `dialer_call.${eventType}`,
        id: ctx.input.callId || `dialer-${Date.now()}`,
        output: {
          callId: payload.callId || payload.call_id || payload.id,
          uniqueId: payload.uniqueId || payload.unique_id,
          eventType,
          fromNumber: payload.fromNumber || payload.from_number || payload.callerNumber,
          toNumber: payload.toNumber || payload.to_number,
          clientNumber: payload.clientNumber || payload.client_number,
          callType: payload.type,
          callState: payload.state,
          talkTime: payload.talkTime || payload.talk_time,
          totalTime: payload.totalTime || payload.total_time,
          answerTime: payload.answerTime || payload.answer_time,
          agentId: payload.userId?.toString() || payload.agentId?.toString(),
          agentName: payload.agentName || payload.agent_name,
          agentShortNumber: payload.agentShortNumber?.toString(),
          projectName: payload.projectName || payload.project_name,
          projectId: payload.projectId?.toString() || payload.project_id?.toString(),
          outcomeTag: payload.outcomeTag || payload.outcome_tag || payload.resultTag,
          outcomeType: payload.outcomeType || payload.outcome_type,
          aiSummary:
            payload.convoloAiRecordingSummary || payload.aiSummary || payload.ai_summary,
          aiTranscript:
            payload.convoloAiTranscript || payload.aiTranscript || payload.transcript,
          recordingLink: payload.recordingLink || payload.recording_link || payload.recordName,
          crmContactFields,
          additionalData: payload.additionalData
        }
      };
    }
  })
  .build();
