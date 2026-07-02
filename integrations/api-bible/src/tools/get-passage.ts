import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPassage = SlateTool.create(spec, {
  name: 'Get Passage',
  key: 'get_passage',
  description: `Retrieve a range of scripture content by combining two verse IDs with a dash, or by specifying a single chapter/verse reference. Useful for fetching a specific portion of text spanning multiple verses.`,
  instructions: [
    'Passage IDs can be a single verse (e.g., "GEN.1.1"), a chapter (e.g., "GEN.1"), or a range (e.g., "GEN.1.1-GEN.1.5" for Genesis 1:1-5).',
    'Ranges must be within the same book.'
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
      fumsId: z.string().describe('FUMS tracking token')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getPassage(ctx.input.bibleId, ctx.input.passageId, {
      contentType: ctx.input.contentType,
      includeNotes: ctx.input.includeNotes,
      includeTitles: ctx.input.includeTitles,
      includeChapterNumbers: ctx.input.includeChapterNumbers,
      includeVerseNumbers: ctx.input.includeVerseNumbers,
      includeVerseSpans: ctx.input.includeVerseSpans
    });

    let p = result.data;
    return {
      output: {
        passageId: p.passageId,
        bibleId: p.bibleId,
        orgId: p.orgId || '',
        reference: p.reference || '',
        content: p.content || '',
        verseCount: p.verseCount,
        copyright: p.copyright || '',
        fumsId: result.meta?.fumsId || ''
      },
      message: `Retrieved passage **${p.reference}** (${p.verseCount} verse(s)).`
    };
  })
  .build();
