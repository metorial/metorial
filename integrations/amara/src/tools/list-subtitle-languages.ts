import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubtitleLanguages = SlateTool.create(spec, {
  name: 'List Subtitle Languages',
  key: 'list_subtitle_languages',
  description: `List all subtitle languages available for a video, including their completion status, version count, and assigned reviewer/approver.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('The video identifier'),
      limit: z.number().optional().describe('Number of results per page'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of subtitle languages'),
      languages: z.array(
        z.object({
          languageCode: z.string().describe('Language code (BCP-47)'),
          name: z.string().describe('Language name'),
          isPrimaryAudioLanguage: z
            .boolean()
            .describe('Whether this is the primary audio language'),
          isRtl: z.boolean().describe('Whether the language is right-to-left'),
          subtitlesComplete: z.boolean().describe('Whether subtitles are marked complete'),
          subtitleCount: z.number().describe('Number of subtitle lines'),
          published: z.boolean().describe('Whether subtitles are published'),
          versionCount: z.number().describe('Number of subtitle versions'),
          created: z.string().describe('When this language was created')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.listSubtitleLanguages(ctx.input.videoId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let languages = result.objects.map(l => ({
      languageCode: l.language_code,
      name: l.name,
      isPrimaryAudioLanguage: l.is_primary_audio_language,
      isRtl: l.is_rtl,
      subtitlesComplete: l.subtitles_complete,
      subtitleCount: l.subtitle_count,
      published: l.published,
      versionCount: l.versions?.length ?? 0,
      created: l.created
    }));

    return {
      output: {
        totalCount: result.meta.total_count,
        languages
      },
      message: `Found **${result.meta.total_count}** subtitle language(s) for video \`${ctx.input.videoId}\`.`
    };
  })
  .build();
