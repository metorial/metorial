import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialerClient } from '../lib/client';
import { spec } from '../spec';

let dialerCallSchema = z
  .object({
    callId: z.string().optional().describe('Unique call identifier'),
    uniqueId: z.string().optional().describe('Unique external call identifier'),
    timestamp: z.string().optional().describe('ISO timestamp of the call'),
    type: z.number().optional().describe('Call type: 0=inbound, 1=outbound, 2=internal'),
    state: z.number().optional().describe('Call state: 0=unanswered, 1=answered, 2=failed'),
    fromNumber: z.string().optional().describe('Caller phone number'),
    toNumber: z.string().optional().describe('Callee phone number'),
    clientNumber: z.string().optional().describe('Client phone number'),
    answerTime: z.number().optional().describe('Time to answer in seconds'),
    callTime: z.number().optional().describe('Total call time in seconds'),
    talkTime: z.number().optional().describe('Talk duration in seconds'),
    aiTalkTime: z.number().optional().describe('AI talk time in seconds'),
    totalTime: z.number().optional().describe('Total duration in seconds'),
    projectName: z.string().optional().describe('Associated project name'),
    projectId: z.string().optional().describe('Associated project ID'),
    userId: z.string().optional().describe('Agent user ID'),
    agentShortNumber: z.string().optional().describe('Agent short number'),
    tags: z.array(z.string()).optional().describe('Call tags'),
    outcomeTag: z.string().optional().describe('Call outcome tag'),
    outcomeType: z.string().optional().describe('Call outcome type'),
    qualityRating: z.number().optional().describe('Call quality rating'),
    recordName: z.string().optional().describe('Recording file name'),
    isRecordReady: z.boolean().optional().describe('Whether the recording is available'),
    aiSummary: z.string().optional().describe('AI-generated call summary'),
    aiTitle: z.string().optional().describe('AI-generated call title'),
    label: z.string().optional().describe('Call label')
  })
  .describe('Individual dialer call record');

export let getDialerCallReports = SlateTool.create(spec, {
  name: 'Get Dialer Call Reports',
  key: 'get_dialer_call_reports',
  description: `Retrieve call reports from the Power Dialer product. Returns a list of calls with details including type, state, duration, phone numbers, project, tags, outcomes, AI summaries, and more. Filter by date range, call type, state, agents, teams, projects, tags, and talk time.`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'Requires a Power Dialer API key (dialerToken in auth).',
    'Call types: 0=inbound, 1=outbound, 2=internal.',
    'Call states: 0=unanswered, 1=answered, 2=failed.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dayFrom: z.string().describe('Start date in YYYY-MM-DD format'),
      dayTo: z.string().describe('End date in YYYY-MM-DD format'),
      searchString: z.string().optional().describe('Text search filter'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the query (e.g., America/New_York)'),
      types: z
        .array(z.number())
        .optional()
        .describe('Call types to include: 0=inbound, 1=outbound, 2=internal'),
      states: z
        .array(z.number())
        .optional()
        .describe('Call states to include: 0=unanswered, 1=answered, 2=failed'),
      agentIds: z.array(z.string()).optional().describe('Filter by specific agent IDs'),
      teamIds: z.array(z.string()).optional().describe('Filter by specific team IDs'),
      projectIds: z.array(z.string()).optional().describe('Filter by specific project IDs'),
      tags: z.array(z.string()).optional().describe('Filter by call tags'),
      outcomes: z.array(z.string()).optional().describe('Filter by call outcomes'),
      outcomeTypes: z.array(z.string()).optional().describe('Filter by outcome types'),
      talkTimeFrom: z.number().optional().describe('Minimum talk time in seconds'),
      talkTimeTo: z.number().optional().describe('Maximum talk time in seconds'),
      answerTimeFrom: z.number().optional().describe('Minimum answer time in seconds'),
      answerTimeTo: z.number().optional().describe('Maximum answer time in seconds'),
      page: z.number().optional().describe('Page number (default 1)'),
      itemsPerPage: z.number().optional().describe('Items per page (default 100)'),
      sortBy: z
        .enum(['timestamp', 'talkTime', 'answerTime'])
        .optional()
        .describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      calls: z.array(dialerCallSchema).describe('List of dialer call records'),
      page: z.number().optional().describe('Current page number'),
      pagesCount: z.number().optional().describe('Total pages available'),
      totalItems: z.number().optional().describe('Total matching call records')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.dialerToken) {
      throw new Error(
        'Power Dialer API key (dialerToken) is required for this action. Please configure it in your authentication settings.'
      );
    }

    let client = new DialerClient({
      apiKey: ctx.auth.dialerToken
    });

    let result = await client.getCallsList(ctx.input);

    let calls = (result.calls || []).map((call: any) => ({
      callId: call.id?.toString(),
      uniqueId: call.uniqueId,
      timestamp: call.timestamp,
      type: call.type,
      state: call.state,
      fromNumber: call.fromNumber,
      toNumber: call.toNumber,
      clientNumber: call.clientNumber,
      answerTime: call.answerTime,
      callTime: call.callTime,
      talkTime: call.talkTime,
      aiTalkTime: call.aiTalkTime,
      totalTime: call.totalTime,
      projectName: call.projectName,
      projectId: call.projectId?.toString(),
      userId: call.userId?.toString(),
      agentShortNumber: call.agentShortNumber?.toString(),
      tags: call.tags,
      outcomeTag: call.outcomeTag,
      outcomeType: call.outcomeType,
      qualityRating: call.qualityRating,
      recordName: call.recordName,
      isRecordReady: call.isRecordReady,
      aiSummary: call.convoloAiRecordingSummary,
      aiTitle: call.convoloAiRecordingTitle,
      label: call.label
    }));

    return {
      output: {
        calls,
        page: result.page,
        pagesCount: result.pagesCount,
        totalItems: result.totalItems
      },
      message: `Retrieved **${calls.length}** dialer call records (page ${result.page ?? 1} of ${result.pagesCount ?? 1}, total: ${result.totalItems ?? calls.length}). Date range: ${ctx.input.dayFrom} to ${ctx.input.dayTo}.`
    };
  })
  .build();
