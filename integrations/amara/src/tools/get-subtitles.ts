import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubtitles = SlateTool.create(spec, {
  name: 'Get Subtitles',
  key: 'get_subtitles',
  description: `Fetch subtitles for a video in a specific language. Returns subtitle content in the requested format (JSON, DFXP, SRT, VTT, SBV, SSA), along with metadata such as version, author, and title.`,
  instructions: [
    'Use subFormat to get subtitles in a specific subtitle format (json, dfxp, srt, vtt, sbv, ssa).',
    'Use versionNumber to fetch a specific version. Omit to get the latest published version.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('The video identifier'),
      languageCode: z.string().describe('Language code (BCP-47, e.g. "en", "fr", "es")'),
      subFormat: z
        .enum(['json', 'dfxp', 'srt', 'vtt', 'sbv', 'ssa'])
        .optional()
        .describe('Subtitle format to return'),
      versionNumber: z.number().optional().describe('Specific version number to fetch')
    })
  )
  .output(
    z.object({
      versionNumber: z.number().describe('Subtitle version number'),
      subtitles: z.any().describe('Subtitle content in the requested format'),
      subFormat: z.string().describe('Format of the returned subtitles'),
      author: z
        .object({
          username: z.string().describe('Author username'),
          userId: z.string().describe('Author user ID')
        })
        .describe('Author of this subtitle version'),
      languageCode: z.string().describe('Language code'),
      languageName: z.string().describe('Language name'),
      title: z.string().describe('Subtitle title'),
      description: z.string().describe('Subtitle description'),
      videoTitle: z.string().describe('Parent video title'),
      videoDescription: z.string().describe('Parent video description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let s = await client.getSubtitles(ctx.input.videoId, ctx.input.languageCode, {
      subFormat: ctx.input.subFormat,
      versionNumber: ctx.input.versionNumber
    });

    return {
      output: {
        versionNumber: s.version_number,
        subtitles: s.subtitles,
        subFormat: s.sub_format,
        author: {
          username: s.author?.username ?? '',
          userId: s.author?.id ?? ''
        },
        languageCode: s.language?.code ?? ctx.input.languageCode,
        languageName: s.language?.name ?? '',
        title: s.title,
        description: s.description,
        videoTitle: s.video_title,
        videoDescription: s.video_description
      },
      message: `Fetched subtitles for **${s.language?.name ?? ctx.input.languageCode}** (v${s.version_number}) on video "${s.video_title}".`
    };
  })
  .build();
