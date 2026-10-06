import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export const listTranslations = SlateTool.create(spec, {
  key: 'list_translations',
  name: 'List Translations',
  description:
    'List video translation jobs with their IDs, languages, and status. Pass an ID to get_translation_status or delete_translation.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      paginationToken: z.string().optional().describe('Cursor from the previous page'),
      limit: z.number().int().min(1).max(100).optional()
    })
  )
  .output(
    z.object({
      translations: z.array(
        z.object({
          videoTranslateId: z.string(),
          status: z.string(),
          language: z.string().nullable()
        })
      ),
      paginationToken: z.string().nullable(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new HeyGenClient(ctx.auth).listTranslations({
      token: ctx.input.paginationToken,
      limit: ctx.input.limit
    });
    return {
      output: result,
      message: `Found **${result.translations.length}** translation jobs.`
    };
  })
  .build();

export const deleteTranslation = SlateTool.create(spec, {
  key: 'delete_translation',
  name: 'Delete Translation',
  description:
    'Permanently delete a video translation and its generated files. Call list_translations to discover IDs.',
  tags: { destructive: true }
})
  .input(
    z.object({
      videoTranslateId: z
        .string()
        .min(1)
        .describe('Translation ID from list_translations or translate_video')
    })
  )
  .output(z.object({ videoTranslateId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new HeyGenClient(ctx.auth).deleteTranslation(ctx.input.videoTranslateId);
    return {
      output: { videoTranslateId: ctx.input.videoTranslateId, deleted: true },
      message: `Deleted translation **${ctx.input.videoTranslateId}**.`
    };
  })
  .build();
