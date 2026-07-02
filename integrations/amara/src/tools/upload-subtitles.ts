import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadSubtitles = SlateTool.create(spec, {
  name: 'Upload Subtitles',
  key: 'upload_subtitles',
  description: `Upload or update subtitles for a video in a specific language. Provide subtitle content inline or via URL in any supported format. Optionally perform a workflow action (save draft, publish, approve, etc.) together with the upload.`,
  instructions: [
    'Provide either subtitles (inline content) or subtitlesUrl (URL to subtitle file), not both.',
    'The subFormat should match the format of the provided subtitle content (defaults to dfxp).',
    'Use the action field to combine upload with a workflow action (e.g. "save-draft", "publish").'
  ]
})
  .input(
    z.object({
      videoId: z.string().describe('The video identifier'),
      languageCode: z.string().describe('Language code (BCP-47, e.g. "en", "fr")'),
      subtitles: z.string().optional().describe('Inline subtitle content'),
      subtitlesUrl: z.string().optional().describe('URL to a subtitle file to import'),
      subFormat: z
        .enum(['dfxp', 'srt', 'vtt', 'sbv', 'ssa', 'json'])
        .optional()
        .describe('Format of the provided subtitles (default: dfxp)'),
      title: z.string().optional().describe('Title for the subtitles'),
      description: z.string().optional().describe('Description for the subtitles'),
      action: z
        .string()
        .optional()
        .describe('Workflow action to perform (e.g. "save-draft", "publish", "approve")')
    })
  )
  .output(
    z.object({
      versionNumber: z.number().describe('Created subtitle version number'),
      languageCode: z.string().describe('Language code'),
      subFormat: z.string().describe('Format of the subtitles'),
      author: z
        .object({
          username: z.string().describe('Author username'),
          userId: z.string().describe('Author user ID')
        })
        .describe('Author of this version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let s = await client.createSubtitles(ctx.input.videoId, ctx.input.languageCode, {
      subtitles: ctx.input.subtitles,
      subtitlesUrl: ctx.input.subtitlesUrl,
      subFormat: ctx.input.subFormat,
      title: ctx.input.title,
      description: ctx.input.description,
      action: ctx.input.action
    });

    return {
      output: {
        versionNumber: s.version_number,
        languageCode: s.language?.code ?? ctx.input.languageCode,
        subFormat: s.sub_format,
        author: {
          username: s.author?.username ?? '',
          userId: s.author?.id ?? ''
        }
      },
      message: `Uploaded subtitles as version **${s.version_number}** for language **${s.language?.name ?? ctx.input.languageCode}**.${ctx.input.action ? ` Action "${ctx.input.action}" applied.` : ''}`
    };
  })
  .build();
