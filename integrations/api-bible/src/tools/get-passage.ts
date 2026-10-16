import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { scriptureContent } from '../lib/content';
import { spec } from '../spec';

export let getPassage = SlateTool.create(spec, {
  name: 'Get Passage',
  key: 'get_passage',
  description: `Retrieve a range of scripture content by combining two verse IDs with a dash, or by specifying a single chapter/verse reference. Useful for fetching a specific portion of text spanning multiple verses.`,
  instructions: [
    'Passage IDs can be a single verse (e.g., "GEN.1.1"), a chapter (e.g., "GEN.1"), or a range (e.g., "GEN.1.1-GEN.1.5" for Genesis 1:1-5).',
    'Ranges may span chapters and books. Responses are limited to 200 verses; split larger ranges into smaller passages.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bibleId: z.string().describe('The Bible version ID'),
      passageId: z
        .string()
        .describe('Passage ID or range (e.g., "GEN.1.1-GEN.1.5", "MAT.5.1-MAT.5.12")'),
      useOrgId: z
        .boolean()
        .optional()
        .describe(
          'Match the supplied verse or passage IDs against original versification IDs'
        ),
      parallels: z
        .string()
        .optional()
        .describe('Comma-separated Bible IDs to return parallel scripture from'),
      contentType: z
        .enum(['html', 'json', 'text'])
        .optional()
        .describe('Content format. Defaults to HTML.'),
      includeNotes: z.boolean().optional().describe('Include footnotes'),
      includeTitles: z.boolean().optional().describe('Include section titles'),
      includeChapterNumbers: z.boolean().optional().describe('Include chapter numbers'),
      includeVerseNumbers: z.boolean().optional().describe('Include verse numbers'),
      includeVerseSpans: z.boolean().optional().describe('Include verse spans')
    })
  )
  .output(
    z.object({
      passageId: z.string().describe('Passage identifier'),
      bibleId: z.string().describe('Bible version ID'),
      orgId: z.string().describe('Original passage identifier'),
      reference: z.string().describe('Human-readable passage reference'),
      content: z.string().describe('Passage scripture content'),
      verseCount: z.number().describe('Number of verses in the passage'),
      copyright: z.string().describe('Copyright information'),
      fumsToken: z.string().optional().describe('Current FUMS token for scripture engagement'),
      meta: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Original scripture response metadata'),
      fumsId: z.string().optional().describe('Legacy FUMS tracking token, when supplied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getPassage(ctx.input.bibleId, ctx.input.passageId, {
      contentType: ctx.input.contentType,
      parallels: ctx.input.parallels,
      useOrgId: ctx.input.useOrgId,
      includeNotes: ctx.input.includeNotes,
      includeTitles: ctx.input.includeTitles,
      includeChapterNumbers: ctx.input.includeChapterNumbers,
      includeVerseNumbers: ctx.input.includeVerseNumbers,
      includeVerseSpans: ctx.input.includeVerseSpans
    });

    let p = result.data;
    return {
      output: {
        passageId: p.id,
        bibleId: p.bibleId,
        orgId: p.orgId,
        reference: p.reference,
        content: scriptureContent(p.content),
        verseCount: p.verseCount,
        copyright: p.copyright,
        fumsToken: result.meta?.fumsToken,
        meta: result.meta,
        fumsId: result.meta?.fumsId
      },
      message: `Retrieved passage **${p.reference}** (${p.verseCount} verse(s)).`
    };
  })
  .build();
