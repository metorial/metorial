import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

let partySchema = z
  .object({
    speakerId: z.string().optional().describe('Speaker identifier'),
    name: z.string().optional().describe('Name of the participant'),
    emailAddress: z.string().optional().describe('Email of the participant'),
    title: z.string().optional().describe('Job title of the participant'),
    affiliation: z
      .string()
      .optional()
      .describe('Whether the participant is internal or external')
  })
  .describe('Call participant');

let callDetailSchema = z.object({
  callId: z.string().describe('Unique call identifier'),
  title: z.string().optional().describe('Call title'),
  started: z.string().optional().describe('ISO 8601 start time'),
  duration: z.number().optional().describe('Duration in seconds'),
  direction: z.string().optional().describe('Inbound or Outbound'),
  scope: z.string().optional().describe('Internal or External'),
  url: z.string().optional().describe('URL to the call in Gong'),
  parties: z.array(partySchema).optional().describe('Call participants'),
  topics: z
    .array(
      z.object({
        name: z.string().optional(),
        duration: z.number().optional()
      })
    )
    .optional()
    .describe('Topics discussed'),
  trackers: z
    .array(
      z.object({
        name: z.string().optional(),
        count: z.number().optional(),
        occurrences: z.array(z.any()).optional()
      })
    )
    .optional()
    .describe('Tracker matches found'),
  brief: z.string().optional().describe('AI-generated brief summary'),
  outline: z.array(z.any()).optional().describe('Structured outline of the call'),
  highlights: z.array(z.any()).optional().describe('Key highlights'),
  callOutcome: z.string().optional().describe('Outcome of the call'),
  keyPoints: z.array(z.any()).optional().describe('Key points from the call'),
  publicComments: z.array(z.any()).optional().describe('Public comments on the call'),
  personInteractionStats: z
    .array(z.any())
    .optional()
    .describe('Per-person interaction statistics'),
  questions: z.array(z.any()).optional().describe('Questions asked during the call'),
  speakers: z.array(z.any()).optional().describe('Speaker details and segments'),
  mediaUrl: z.string().optional().describe('URL to call recording media')
});

export let getCallDetails = SlateTool.create(spec, {
  name: 'Get Call Details',
  key: 'get_call_details',
  description: `Retrieve detailed/extensive data for specific calls by their IDs or date range. Returns rich data including participants, topics, trackers, AI brief, highlights, key points, interaction stats, and more. Use the **includeContent** and **includeInteraction** flags to control which data is returned.`,
  instructions: [
    'Provide either callIds or a date range (fromDateTime/toDateTime) to filter calls.',
    'Enable content and interaction flags to get richer data — these require the appropriate API scopes.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      callIds: z.array(z.string()).optional().describe('Specific call IDs to retrieve'),
      fromDateTime: z.string().optional().describe('Start of date range in ISO 8601 format'),
      toDateTime: z.string().optional().describe('End of date range in ISO 8601 format'),
      workspaceId: z.string().optional().describe('Filter by workspace ID'),
      includeParties: z.boolean().optional().describe('Include participant details'),
      includeContent: z
        .boolean()
        .optional()
        .describe(
          'Include topics, trackers, brief, outline, highlights, key points, and call outcome'
        ),
      includeInteraction: z
        .boolean()
        .optional()
        .describe('Include interaction stats, questions, and speakers'),
      includeCollaboration: z.boolean().optional().describe('Include public comments'),
      includeMedia: z.boolean().optional().describe('Include media URL'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      calls: z.array(callDetailSchema).describe('Detailed call data'),
      totalRecords: z.number().optional().describe('Total number of matching records'),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let contentFields: Record<string, boolean> = {};
    if (ctx.input.includeContent) {
      contentFields = {
        pointsOfInterest: true,
        structure: true,
        topics: true,
        trackers: true,
        brief: true,
        outline: true,
        highlights: true,
        callOutcome: true,
        keyPoints: true
      };
    }

    let interactionFields: Record<string, boolean> = {};
    if (ctx.input.includeInteraction) {
      interactionFields = {
        personInteractionStats: true,
        questions: true,
        speakers: true,
        video: true
      };
    }

    let result = await client.getCallsExtensive({
      filter: {
        callIds: ctx.input.callIds,
        fromDateTime: ctx.input.fromDateTime,
        toDateTime: ctx.input.toDateTime,
        workspaceId: ctx.input.workspaceId
      },
      contentSelector: {
        exposedFields: {
          collaboration: ctx.input.includeCollaboration ?? false,
          content: Object.keys(contentFields).length > 0 ? (contentFields as any) : undefined,
          interaction:
            Object.keys(interactionFields).length > 0 ? (interactionFields as any) : undefined,
          media: ctx.input.includeMedia ?? false,
          parties: ctx.input.includeParties ?? true
        }
      },
      cursor: ctx.input.cursor
    });

    let calls = (result.calls || []).map((call: any) => ({
      callId: call.metaData?.id || call.id,
      title: call.metaData?.title,
      started: call.metaData?.started,
      duration: call.metaData?.duration,
      direction: call.metaData?.direction,
      scope: call.metaData?.scope,
      url: call.metaData?.url,
      parties: call.parties,
      topics: call.content?.topics,
      trackers: call.content?.trackers,
      brief: call.content?.brief,
      outline: call.content?.outline,
      highlights: call.content?.highlights,
      callOutcome: call.content?.callOutcome,
      keyPoints: call.content?.keyPoints,
      publicComments: call.collaboration?.publicComments,
      personInteractionStats: call.interaction?.personInteractionStats,
      questions: call.interaction?.questions,
      speakers: call.interaction?.speakers,
      mediaUrl: call.media?.audioUrl || call.media?.videoUrl
    }));

    return {
      output: {
        calls,
        totalRecords: result.records?.totalRecords,
        cursor: result.records?.cursor
      },
      message: `Retrieved detailed data for ${calls.length} call(s).`
    };
  })
  .build();
