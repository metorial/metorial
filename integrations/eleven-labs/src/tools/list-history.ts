import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

let historyItemSchema = z.object({
  historyItemId: z.string().describe('Unique history item identifier'),
  voiceId: z.string().optional().describe('Voice used for generation'),
  voiceName: z.string().optional().describe('Name of the voice used'),
  modelId: z.string().optional().describe('Model used for generation'),
  text: z.string().optional().describe('Input text that was converted'),
  dateUnix: z.number().optional().describe('Unix timestamp of generation'),
  characterCountChangeFrom: z
    .number()
    .optional()
    .describe('Character count before generation'),
  characterCountChangeTo: z.number().optional().describe('Character count after generation'),
  state: z.string().optional().describe('State of the history item'),
  contentType: z.string().optional().describe('Content type of the generated audio')
});

export let listHistory = SlateTool.create(spec, {
  name: 'List History',
  key: 'list_history',
  description: `Browse your text-to-speech generation history. Returns metadata about past generations including the text, voice, model used, and timestamps. Use pagination to navigate through older items.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of history items to return (max 1000, default 100)'),
      startAfterHistoryItemId: z
        .string()
        .optional()
        .describe('History item ID to start after for pagination')
    })
  )
  .output(
    z.object({
      history: z.array(historyItemSchema).describe('List of history items'),
      hasMore: z.boolean().optional().describe('Whether more items are available'),
      lastHistoryItemId: z
        .string()
        .optional()
        .describe('ID of the last item (use for pagination)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.listHistory({
      pageSize: ctx.input.pageSize,
      startAfterHistoryItemId: ctx.input.startAfterHistoryItemId
    });

    let data = result as Record<string, unknown>;
    let rawHistory = (data.history || []) as Record<string, unknown>[];

    let history = rawHistory.map(h => ({
      historyItemId: h.history_item_id as string,
      voiceId: h.voice_id as string | undefined,
      voiceName: h.voice_name as string | undefined,
      modelId: h.model_id as string | undefined,
      text: h.text as string | undefined,
      dateUnix: h.date_unix as number | undefined,
      characterCountChangeFrom: h.character_count_change_from as number | undefined,
      characterCountChangeTo: h.character_count_change_to as number | undefined,
      state: h.state as string | undefined,
      contentType: h.content_type as string | undefined
    }));

    let lastId = history.length > 0 ? history[history.length - 1]?.historyItemId : undefined;

    return {
      output: {
        history,
        hasMore: data.has_more as boolean | undefined,
        lastHistoryItemId: lastId
      },
      message: `Retrieved ${history.length} history item(s).`
    };
  })
  .build();
