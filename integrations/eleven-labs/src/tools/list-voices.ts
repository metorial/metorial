import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

let voiceSchema = z.object({
  voiceId: z.string().describe('Unique voice identifier'),
  name: z.string().describe('Voice display name'),
  category: z
    .string()
    .optional()
    .describe('Voice category (premade, cloned, generated, professional)'),
  description: z.string().optional().describe('Voice description'),
  labels: z.record(z.string(), z.string()).optional().describe('Voice labels/tags'),
  previewUrl: z.string().optional().describe('URL to a preview audio sample')
});

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `Search and browse available voices with filtering, sorting, and pagination. Returns voice metadata including IDs needed for text-to-speech and other voice operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search term to filter voices by name, description, labels, or category'),
      voiceType: z
        .enum([
          'personal',
          'community',
          'default',
          'workspace',
          'non-default',
          'non-community',
          'saved'
        ])
        .optional()
        .describe('Filter voices by type'),
      category: z
        .enum(['premade', 'cloned', 'generated', 'professional'])
        .optional()
        .describe('Filter voices by category'),
      fineTuningState: z
        .enum([
          'draft',
          'not_verified',
          'not_started',
          'queued',
          'fine_tuning',
          'fine_tuned',
          'failed',
          'delayed'
        ])
        .optional()
        .describe('Filter professional voice clones by fine-tuning state'),
      collectionId: z.string().optional().describe('Collection ID to filter voices by'),
      includeTotalCount: z
        .boolean()
        .optional()
        .describe('Whether to include totalCount. Defaults to the provider behavior.'),
      voiceIds: z
        .array(z.string())
        .max(100)
        .optional()
        .describe('Specific voice IDs to look up, maximum 100'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of voices to return per page (max 100, default 10)'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response'),
      sort: z
        .enum(['created_at_unix', 'name'])
        .optional()
        .describe('Field to sort results by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      voices: z.array(voiceSchema).describe('List of voice objects'),
      hasMore: z.boolean().describe('Whether more results are available'),
      totalCount: z.number().optional().describe('Total number of matching voices'),
      nextPageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.listVoices({
      search: ctx.input.search,
      voiceType: ctx.input.voiceType,
      category: ctx.input.category,
      fineTuningState: ctx.input.fineTuningState,
      collectionId: ctx.input.collectionId,
      includeTotalCount: ctx.input.includeTotalCount,
      voiceIds: ctx.input.voiceIds,
      pageSize: ctx.input.pageSize,
      nextPageToken: ctx.input.nextPageToken,
      sort: ctx.input.sort,
      sortDirection: ctx.input.sortDirection
    });

    let data = result as Record<string, unknown>;
    let rawVoices = (data.voices || []) as Record<string, unknown>[];

    let voices = rawVoices.map(v => ({
      voiceId: v.voice_id as string,
      name: v.name as string,
      category: v.category as string | undefined,
      description: v.description as string | undefined,
      labels: v.labels as Record<string, string> | undefined,
      previewUrl: v.preview_url as string | undefined
    }));

    return {
      output: {
        voices,
        hasMore: data.has_more as boolean,
        totalCount: data.total_count as number | undefined,
        nextPageToken: data.next_page_token as string | undefined
      },
      message: `Found ${voices.length} voice(s)${data.has_more ? ' (more available)' : ''}.${ctx.input.search ? ` Search: "${ctx.input.search}"` : ''}`
    };
  })
  .build();
