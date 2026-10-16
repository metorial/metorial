import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubtitleVersions = SlateTool.create(spec, {
  name: 'List Subtitle Versions',
  key: 'list_subtitle_versions',
  description:
    'List the version history for one video language, including version numbers, authors, creation dates, and publication state. Pass a versionNumber to get_subtitles to retrieve or download a specific revision.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      videoId: z.string().describe('The video identifier'),
      languageCode: z.string().describe('Language code (BCP-47, e.g. "en")')
    })
  )
  .output(
    z.object({
      languageCode: z.string().describe('Subtitle language code'),
      versions: z.array(
        z.object({
          versionNumber: z.number().describe('Version number for get_subtitles'),
          published: z.boolean().describe('Whether this version is publicly viewable'),
          created: z.string().describe('When this version was created'),
          authorId: z.string().optional().describe('Stable author user ID'),
          authorUsername: z.string().optional().describe('Author username, when returned')
        })
      ),
      raw: z
        .unknown()
        .optional()
        .describe('Complete subtitle language details returned by Amara')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let language = await client.getSubtitleLanguage(ctx.input.videoId, ctx.input.languageCode);
    let versions = language.versions.map(version => ({
      versionNumber: version.version_number,
      published: version.published,
      created: version.created,
      authorId: version.author?.id,
      authorUsername: version.author?.username
    }));
    return {
      output: { languageCode: language.language_code, versions, raw: language },
      message: `Found **${versions.length}** subtitle version(s) for \`${ctx.input.languageCode}\` on video \`${ctx.input.videoId}\`.`
    };
  })
  .build();
