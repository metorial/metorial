import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let listHistoryTool = SlateTool.create(spec, {
  name: 'List History',
  key: 'list_history',
  description: `List previously generated audio items from your ElevenLabs history. Supports filtering by voice and search text. Returns metadata for each generation including text, voice, model, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of items to return (1-100). Defaults to 20'),
      startAfterHistoryItemId: z
        .string()
        .optional()
        .describe('Pagination cursor: start after this history item ID'),
      voiceId: z.string().optional().describe('Filter by voice ID'),
      search: z.string().optional().describe('Search term to filter history items')
    })
  )
  .output(
    z.object({
      history: z
        .array(
          z.object({
            historyItemId: z.string().describe('Unique history item ID'),
            voiceId: z.string().optional().describe('Voice used for generation'),
            voiceName: z.string().optional().describe('Name of the voice used'),
            voiceCategory: z
              .string()
              .optional()
              .describe('Category of the voice (premade, cloned, etc.)'),
            modelId: z.string().optional().describe('Model used for generation'),
            text: z.string().optional().describe('Input text used for generation'),
            dateUnix: z.number().describe('Unix timestamp of creation'),
            characterCountChangeFrom: z
              .number()
              .optional()
              .describe('Character count before generation'),
            characterCountChangeTo: z
              .number()
              .optional()
              .describe('Character count after generation'),
            contentType: z.string().optional().describe('Content type of the generated audio'),
            source: z
              .string()
              .optional()
              .describe('Source of the generation (TTS, STS, Dubbing, etc.)')
          })
        )
        .describe('List of history items'),
      hasMore: z.boolean().describe('Whether more items are available'),
      lastHistoryItemId: z.string().optional().describe('ID of the last item for pagination')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.listHistory({
      pageSize: ctx.input.pageSize,
      startAfterHistoryItemId: ctx.input.startAfterHistoryItemId,
      voiceId: ctx.input.voiceId,
      search: ctx.input.search
    });

    let history = (result.history || []).map((item: any) => ({
      historyItemId: item.history_item_id,
      voiceId: item.voice_id,
      voiceName: item.voice_name,
      voiceCategory: item.voice_category,
      modelId: item.model_id,
      text: item.text,
      dateUnix: item.date_unix,
      characterCountChangeFrom: item.character_count_change_from,
      characterCountChangeTo: item.character_count_change_to,
      contentType: item.content_type,
      source: item.source
    }));

    return {
      output: {
        history,
        hasMore: result.has_more || false,
        lastHistoryItemId: result.last_history_item_id
      },
      message: `Retrieved ${history.length} history items${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
