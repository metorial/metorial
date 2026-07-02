import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ownerSchema = z
  .object({
    userUuid: z.string().optional().describe('UUID of the owner'),
    name: z.string().optional().describe('Name of the owner'),
    email: z.string().optional().describe('Email of the owner')
  })
  .nullable()
  .optional();

let callSummarySchema = z.object({
  callUuid: z.string().describe('UUID of the call'),
  title: z.string().nullable().optional().describe('Title of the call'),
  description: z.string().nullable().optional().describe('Description of the call'),
  direction: z.string().nullable().optional().describe('Call direction: inbound or outbound'),
  duration: z.number().nullable().optional().describe('Duration in seconds'),
  source: z.string().nullable().optional().describe('Integration source'),
  sourceId: z.string().nullable().optional().describe('External source ID'),
  isVideo: z.boolean().nullable().optional().describe('Whether this is a video call'),
  locale: z.string().nullable().optional().describe('Language locale code'),
  owner: ownerSchema.describe('Call owner'),
  performedAt: z
    .string()
    .nullable()
    .optional()
    .describe('ISO 8601 timestamp when the call was performed'),
  createdAt: z.string().nullable().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('ISO 8601 last updated timestamp'),
  recordingUrl: z.string().nullable().optional().describe('URL to the call recording'),
  leexiUrl: z.string().nullable().optional().describe('URL to the call in the Leexi platform'),
  simpleTranscript: z
    .string()
    .nullable()
    .optional()
    .describe('Simple text transcript (only if requested)')
});

export let listCalls = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `List calls and meetings in your Leexi workspace with flexible filtering. Supports filtering by date range, source, owner, participants, customer phone numbers, and email addresses. Returns call metadata and optionally includes simple transcripts.`,
  instructions: [
    'Use "withSimpleTranscript: true" to include the text transcript in results.',
    'Date filters use ISO 8601 format: YYYY-MM-DDTHH:MM:SS.000Z.',
    'Use the "order" parameter to sort results (e.g., "created_at desc", "performed_at asc").'
  ],
  constraints: ['Maximum 100 items per page.', 'Rate limited to 50 requests/minute.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      items: z.number().optional().describe('Number of items per page (1-100, default: 10)'),
      order: z
        .string()
        .optional()
        .describe(
          'Sort order: "created_at desc", "created_at asc", "performed_at desc", "performed_at asc", "updated_at desc", "updated_at asc"'
        ),
      dateFilter: z
        .enum(['created_at', 'performed_at', 'updated_at'])
        .optional()
        .describe('Which date field to filter on (default: created_at)'),
      from: z.string().optional().describe('Start date filter in ISO 8601 format'),
      to: z.string().optional().describe('End date filter in ISO 8601 format'),
      source: z.string().optional().describe('Filter by integration source slug'),
      sourceIds: z
        .array(z.string())
        .optional()
        .describe('Filter by call IDs within the integration'),
      ownerUuids: z.array(z.string()).optional().describe('Filter by owner user UUIDs'),
      participatingUserUuids: z
        .array(z.string())
        .optional()
        .describe('Filter by participating user UUIDs'),
      customerPhoneNumbers: z
        .array(z.string())
        .optional()
        .describe('Filter by customer phone numbers'),
      customerEmailAddresses: z
        .array(z.string())
        .optional()
        .describe('Filter by customer email addresses'),
      withSimpleTranscript: z
        .boolean()
        .optional()
        .describe('Include simple text transcript in results (default: false)')
    })
  )
  .output(
    z.object({
      calls: z.array(callSummarySchema).describe('List of calls'),
      pagination: z.object({
        page: z.number().describe('Current page number'),
        items: z.number().describe('Items per page'),
        count: z.number().describe('Total number of calls matching the filter')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let response = await client.listCalls(ctx.input);

    let calls = (response.data || []).map((c: any) => ({
      callUuid: c.uuid,
      title: c.title,
      description: c.description,
      direction: c.direction,
      duration: c.duration,
      source: c.source,
      sourceId: c.source_id,
      isVideo: c.is_video,
      locale: c.locale,
      owner: c.owner
        ? {
            userUuid: c.owner.uuid,
            name: c.owner.name,
            email: c.owner.email
          }
        : null,
      performedAt: c.performed_at,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      recordingUrl: c.recording_url,
      leexiUrl: c.leexi_url,
      simpleTranscript: c.simple_transcript
    }));

    return {
      output: {
        calls,
        pagination: response.pagination
      },
      message: `Found **${response.pagination.count}** calls (page ${response.pagination.page}).`
    };
  })
  .build();
