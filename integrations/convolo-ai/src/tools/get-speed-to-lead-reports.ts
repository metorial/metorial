import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeedToLeadClient } from '../lib/client';
import { spec } from '../spec';

let callAgentSchema = z
  .object({
    agentId: z.string().optional().describe('Agent identifier'),
    agentPhone: z.string().optional().describe('Agent phone number'),
    agentName: z.string().optional().describe('Agent name'),
    agentEmail: z.string().optional().describe('Agent email')
  })
  .describe('Agent who handled the call');

let callLeadSchema = z
  .object({
    leadPhone: z.string().optional().describe('Lead phone number'),
    leadId: z.string().optional().describe('Lead identifier'),
    source: z.string().optional().describe('Lead source'),
    country: z.string().optional().describe('Lead country'),
    customParams: z.any().optional().describe('Custom parameters attached to the lead')
  })
  .describe('Lead information');

let callRecordSchema = z
  .object({
    callId: z.string().optional().describe('Unique call identifier'),
    userId: z.string().optional().describe('User identifier'),
    widgetKey: z.string().optional().describe('Widget key'),
    widgetName: z.string().optional().describe('Widget name'),
    callStatus: z.string().optional().describe('Call status (answered, no_answer, missed)'),
    timeStarted: z.string().optional().describe('ISO timestamp when call started'),
    timeAgentAnswered: z.string().optional().describe('ISO timestamp when agent answered'),
    timeLeadAnswered: z.string().optional().describe('ISO timestamp when lead answered'),
    timeEnded: z.string().optional().describe('ISO timestamp when call ended'),
    answerDurationSec: z.number().optional().describe('Duration until answer in seconds'),
    talkDurationSec: z.number().optional().describe('Talk duration in seconds'),
    totalDurationSec: z.number().optional().describe('Total call duration in seconds'),
    disconnectedBy: z.string().optional().describe('Who disconnected the call'),
    recordingLink: z.string().optional().describe('URL to the call recording'),
    agent: callAgentSchema.optional(),
    lead: callLeadSchema.optional()
  })
  .describe('Individual call record');

let statisticsSchema = z
  .object({
    callsTotal: z.number().optional().describe('Total number of calls'),
    callsAnswered: z.number().optional().describe('Number of answered calls'),
    callsNoAnswer: z.number().optional().describe('Number of unanswered calls'),
    callsMissed: z.number().optional().describe('Number of missed calls'),
    minAgentAnswerTime: z.number().optional().describe('Minimum agent answer time in seconds'),
    maxAgentAnswerTime: z.number().optional().describe('Maximum agent answer time in seconds'),
    minTalkTime: z.number().optional().describe('Minimum talk time in seconds'),
    maxTalkTime: z.number().optional().describe('Maximum talk time in seconds')
  })
  .describe('Aggregate call statistics');

export let getSpeedToLeadReports = SlateTool.create(spec, {
  name: 'Get Speed To Lead Call Reports',
  key: 'get_speed_to_lead_reports',
  description: `Retrieve call reports from the Speed To Lead product. Returns a list of calls with details including status, duration, agent and lead information, recording links, and aggregate statistics. Filter by date range, call status, lead phone, agent, talk time, and more.`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'If no date range is specified, the API defaults to the last 30 days.',
    'Maximum of 500 calls per request (default 20).'
  ],
  constraints: ['Maximum 500 calls per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      dateTo: z.string().optional().describe('End date in YYYY-MM-DD format'),
      widgetIds: z.string().optional().describe('Comma-separated widget IDs to filter by'),
      maxCalls: z
        .number()
        .optional()
        .describe('Number of calls to return (default 20, max 500)'),
      page: z.number().optional().describe('Page number for pagination (default 1)'),
      searchString: z
        .string()
        .optional()
        .describe(
          'Search across call IDs, agent names, URLs, comments, custom parameters, phone numbers'
        ),
      status: z
        .enum(['NO_ANSWER', 'OPERATOR_ANSWERED', 'CLIENT_ANSWERED'])
        .optional()
        .describe('Filter by call status'),
      filterUrl: z.string().optional().describe('Filter by widget URL'),
      filterReferer: z.string().optional().describe('Filter by advertising campaign source'),
      filterLeadNumber: z.string().optional().describe('Filter by lead phone number'),
      filterAgent: z.string().optional().describe('Filter by agent name or phone'),
      filterAnswerTimeFrom: z
        .number()
        .optional()
        .describe('Minimum agent answer time in seconds'),
      filterAnswerTimeTo: z
        .number()
        .optional()
        .describe('Maximum agent answer time in seconds'),
      filterTalkTimeFrom: z.number().optional().describe('Minimum talk duration in seconds'),
      filterTalkTimeTo: z.number().optional().describe('Maximum talk duration in seconds')
    })
  )
  .output(
    z.object({
      calls: z.array(callRecordSchema).describe('List of call records'),
      statistics: statisticsSchema.optional().describe('Aggregate call statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeedToLeadClient({
      widgetKey: ctx.auth.widgetKey,
      apiKey: ctx.auth.token
    });

    let result = await client.getCallReports(ctx.input);

    let calls = (result.endCallPayloadList || []).map((call: any) => ({
      callId: call.call_id,
      userId: call.user_id,
      widgetKey: call.widget_key,
      widgetName: call.widget_name,
      callStatus: call.call_status,
      timeStarted: call.time_started_iso_string,
      timeAgentAnswered: call.time_agent_answered_iso_string,
      timeLeadAnswered: call.time_lead_answered_iso_string,
      timeEnded: call.time_ended_iso_string,
      answerDurationSec: call.answer_duration_sec,
      talkDurationSec: call.talk_duration_sec,
      totalDurationSec: call.total_duration_sec,
      disconnectedBy: call.disconnected_by,
      recordingLink: call.recording_link,
      agent: call.agent
        ? {
            agentId: call.agent.id,
            agentPhone: call.agent.phone,
            agentName: call.agent.name,
            agentEmail: call.agent.email
          }
        : undefined,
      lead: call.lead
        ? {
            leadPhone: call.lead.phone,
            leadId: call.lead.lead_id,
            source: call.lead.source,
            country: call.lead.country,
            customParams: call.lead.custom_params
          }
        : undefined
    }));

    let data = result.data || {};
    let statistics = {
      callsTotal: data.calls_total,
      callsAnswered: data.calls_answered,
      callsNoAnswer: data.calls_no_answer,
      callsMissed: data.calls_missed,
      minAgentAnswerTime: data.min_agent_answer_time,
      maxAgentAnswerTime: data.max_agent_answer_time,
      minTalkTime: data.min_talk_time,
      maxTalkTime: data.max_talk_time
    };

    let totalCalls = statistics.callsTotal ?? calls.length;
    let answeredCalls = statistics.callsAnswered ?? 0;

    return {
      output: {
        calls,
        statistics
      },
      message: `Retrieved **${calls.length}** call records. Total: **${totalCalls}** calls, **${answeredCalls}** answered.${ctx.input.dateFrom || ctx.input.dateTo ? ` Date range: ${ctx.input.dateFrom || 'start'} to ${ctx.input.dateTo || 'now'}.` : ''}`
    };
  })
  .build();
