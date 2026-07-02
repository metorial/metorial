import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

let voiceSchema = z.object({
  voiceId: z.string().describe('Unique voice identifier'),
  name: z.string().describe('Display name of the voice'),
  category: z
    .string()
    .optional()
    .describe('Voice category (premade, cloned, generated, professional)'),
  description: z.string().optional().describe('Voice description'),
  previewUrl: z.string().optional().describe('URL to preview the voice'),
  labels: z
    .record(z.string(), z.string())
    .optional()
    .describe('Labels/tags associated with the voice'),
  settings: z
    .object({
      stability: z.number().optional(),
      similarityBoost: z.number().optional(),
      style: z.number().optional(),
      speed: z.number().optional()
    })
    .optional()
    .describe('Default voice settings')
});

export let listVoicesTool = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `Search and list available voices. Supports filtering by name, category, and voice type. Use this to find voice IDs for text-to-speech generation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter voices by name, description, or labels'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of voices to return (1-100). Defaults to 10'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response'),
      sort: z.enum(['created_at_unix', 'name']).optional().describe('Sort field'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      voiceType: z
        .enum(['personal', 'community', 'default', 'workspace', 'non-default', 'saved'])
        .optional()
        .describe('Filter by voice type'),
      category: z
        .enum(['premade', 'cloned', 'generated', 'professional'])
        .optional()
        .describe('Filter by voice category')
    })
  )
  .output(
    z.object({
      voices: z.array(voiceSchema).describe('List of matching voices'),
      hasMore: z.boolean().describe('Whether more voices are available'),
      nextPageToken: z.string().optional().describe('Token to fetch the next page'),
      totalCount: z.number().optional().describe('Total number of matching voices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.searchVoices({
      search: ctx.input.search,
      pageSize: ctx.input.pageSize,
      nextPageToken: ctx.input.nextPageToken,
      sort: ctx.input.sort,
      sortDirection: ctx.input.sortDirection,
      voiceType: ctx.input.voiceType,
      category: ctx.input.category,
      includeTotalCount: true
    });

    let voices = (result.voices || []).map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      category: v.category,
      description: v.description,
      previewUrl: v.preview_url,
      labels: v.labels,
      settings: v.settings
        ? {
            stability: v.settings.stability,
            similarityBoost: v.settings.similarity_boost,
            style: v.settings.style,
            speed: v.settings.speed
          }
        : undefined
    }));

    return {
      output: {
        voices,
        hasMore: result.has_more || false,
        nextPageToken: result.next_page_token,
        totalCount: result.total_count
      },
      message: `Found ${voices.length} voices${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
