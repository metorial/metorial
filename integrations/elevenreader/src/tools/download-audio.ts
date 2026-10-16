import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let downloadHistoryAudioTool = SlateTool.create(spec, {
  name: 'Download History Audio',
  key: 'download_history_audio',
  description:
    'Prepare a previously generated audio file for download. Call list_history to discover history item IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ historyItemId: z.string().describe('History item ID from list_history') }))
  .output(z.object({ historyItemId: z.string(), contentType: z.string().optional() }))
  .handleInvocation(async ctx => {
    let item = await new ElevenLabsClient(ctx.auth.token).getHistoryItem(
      ctx.input.historyItemId
    );
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.elevenlabs.io/v1/history/${encodeURIComponent(item.history_item_id)}/audio`,
      headers: { 'xi-api-key': ctx.auth.token },
      mimeType: item.content_type ?? undefined
    });
    return {
      output: {
        historyItemId: item.history_item_id,
        contentType: item.content_type ?? undefined
      },
      message: 'History audio ready for download.'
    };
  })
  .build();

export let downloadDubbingAudioTool = SlateTool.create(spec, {
  name: 'Download Dubbed File',
  key: 'download_dubbing_audio',
  description:
    'Download the original automatic dub as audio or video. Use get_dubbing to check completion and discover target languages. Dubbing Studio edits are not included.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      dubbingId: z.string().describe('Dubbing project ID from create_dubbing'),
      languageCode: z.string().describe('Target language from get_dubbing')
    })
  )
  .output(z.object({ dubbingId: z.string(), languageCode: z.string() }))
  .handleInvocation(async ctx => {
    let dub = await new ElevenLabsClient(ctx.auth.token).getDubbing(ctx.input.dubbingId);
    if (dub.status !== 'dubbed') {
      throw createApiServiceError(
        `Dubbing is not ready for download (status: ${dub.status}). Call get_dubbing to check progress.`
      );
    }
    let languageCode = dub.target_languages?.find(
      language => language === ctx.input.languageCode
    );
    if (!languageCode) {
      throw createApiServiceError(
        'The requested target language is unavailable. Call get_dubbing to discover available target languages.'
      );
    }
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.elevenlabs.io/v1/dubbing/${encodeURIComponent(dub.dubbing_id)}/audio/${encodeURIComponent(languageCode)}`,
      headers: { 'xi-api-key': ctx.auth.token }
    });
    return {
      output: { dubbingId: dub.dubbing_id, languageCode },
      message: 'Dubbed file ready for download.'
    };
  })
  .build();

export let deleteDubbingTool = SlateTool.create(spec, {
  name: 'Delete Dubbing',
  key: 'delete_dubbing',
  description:
    'Permanently delete a dubbing project. Obtain the project ID from create_dubbing.',
  tags: { destructive: true }
})
  .input(
    z.object({ dubbingId: z.string().describe('Dubbing project ID from create_dubbing') })
  )
  .output(z.object({ success: z.boolean() }))
  .handleInvocation(async ctx => {
    await new ElevenLabsClient(ctx.auth.token).deleteDubbing(ctx.input.dubbingId);
    return { output: { success: true }, message: 'Deleted dubbing project.' };
  })
  .build();
