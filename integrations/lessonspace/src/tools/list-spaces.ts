import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSpaces = SlateTool.create(spec, {
  name: 'List Spaces',
  key: 'list_spaces',
  description: `Retrieves a paginated list of spaces in the organisation. Supports filtering by session, tags, user, date range, and search terms. Use this to browse available virtual classrooms.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter spaces by name.'),
      page: z.number().optional().describe('Page number for pagination.'),
      sessionUuid: z.string().optional().describe('Filter spaces by session UUID.'),
      tagKey: z
        .string()
        .optional()
        .describe('Filter by tag key (must be used with tagValue).'),
      tagValue: z
        .string()
        .optional()
        .describe('Filter by tag value (must be used with tagKey).'),
      dateAfter: z
        .string()
        .optional()
        .describe('Filter spaces with sessions ending after this ISO 8601 timestamp.'),
      dateBefore: z
        .string()
        .optional()
        .describe('Filter spaces with sessions starting before this ISO 8601 timestamp.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of spaces matching the filters.'),
      spaces: z
        .array(
          z.object({
            spaceId: z.string().describe('UUID of the space.'),
            slug: z.string().describe('URL-friendly identifier for the space.'),
            name: z.string().nullable().describe('Space display name.'),
            createdAt: z
              .string()
              .describe('ISO 8601 timestamp of when the space was created.'),
            region: z.string().describe('Region the space is hosted in.'),
            recordAv: z.boolean().nullable().describe('Whether AV recording is enabled.'),
            transcribe: z.boolean().nullable().describe('Whether transcription is enabled.'),
            summarise: z.boolean().nullable().describe('Whether AI summaries are enabled.'),
            tags: z.string().describe('Tags associated with the space.')
          })
        )
        .describe('List of spaces.'),
      hasMore: z.boolean().describe('Whether more pages of results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organisationId: ctx.config.organisationId
    });

    let result = await client.listSpaces({
      search: ctx.input.search,
      page: ctx.input.page,
      session: ctx.input.sessionUuid,
      tagKey: ctx.input.tagKey,
      tagValue: ctx.input.tagValue,
      dateAfter: ctx.input.dateAfter,
      dateBefore: ctx.input.dateBefore
    });

    let spaces = result.results.map(s => ({
      spaceId: s.id,
      slug: s.slug,
      name: s.name,
      createdAt: s.createdAt,
      region: s.region,
      recordAv: s.recordAv,
      transcribe: s.transcribe,
      summarise: s.summarise,
      tags: s.tags
    }));

    return {
      output: {
        totalCount: result.count,
        spaces,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** spaces. Showing ${spaces.length} on this page.`
    };
  })
  .build();
