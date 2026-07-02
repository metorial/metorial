import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let verseSummarySchema = z.object({
  verseId: z.string().describe('Unique verse identifier (e.g., "GEN.1.1")'),
  orgId: z.string().describe('Original verse identifier'),
  bibleId: z.string().describe('Bible version ID'),
  bookId: z.string().describe('Book ID'),
  chapterId: z.string().describe('Chapter ID'),
  reference: z.string().describe('Human-readable verse reference')
});

export let getVerse = SlateTool.create(spec, {
  name: 'Get Verse',
  key: 'get_verse',
  description: `Retrieve verse content or list all verses in a chapter. When a verse ID is provided, returns the scripture text. When only a chapter ID is provided, lists all verse references in that chapter.`,
  instructions: [
    'Verse IDs follow the format "BOOK.CHAPTER.VERSE", e.g., "GEN.1.1" for Genesis 1:1, "JHN.3.16" for John 3:16.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bibleId: z.string().describe('The Bible version ID'),
      chapterId: z
        .string()
        .optional()
        .describe('Chapter ID to list all verses in that chapter (e.g., "GEN.1")'),
      verseId: z
        .string()
        .optional()
        .describe('Specific verse ID to retrieve content (e.g., "GEN.1.1")'),
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
      verses: z.array(verseSummarySchema).optional().describe('List of verses (when listing)'),
      verseId: z.string().optional().describe('Verse ID (when retrieving content)'),
      orgId: z.string().optional().describe('Original verse ID'),
      reference: z.string().optional().describe('Human-readable reference'),
      content: z.string().optional().describe('Verse scripture content'),
      copyright: z.string().optional().describe('Copyright information'),
      fumsId: z.string().optional().describe('FUMS tracking token'),
      nextVerseId: z.string().optional().nullable().describe('ID of the next verse'),
      previousVerseId: z.string().optional().nullable().describe('ID of the previous verse')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.verseId) {
      let result = await client.getVerse(ctx.input.bibleId, ctx.input.verseId, {
        contentType: ctx.input.contentType,
        includeNotes: ctx.input.includeNotes,
        includeTitles: ctx.input.includeTitles,
        includeChapterNumbers: ctx.input.includeChapterNumbers,
        includeVerseNumbers: ctx.input.includeVerseNumbers,
        includeVerseSpans: ctx.input.includeVerseSpans
      });
      let v = result.data;
      return {
        output: {
          verseId: v.verseId,
          orgId: v.orgId || '',
          reference: v.reference || '',
          content: v.content || '',
          copyright: v.copyright || '',
          fumsId: result.meta?.fumsId || '',
          nextVerseId: v.next?.verseId || null,
          previousVerseId: v.previous?.verseId || null
        },
        message: `Retrieved verse **${v.reference}**.`
      };
    }

    if (ctx.input.chapterId) {
      let result = await client.getVerses(ctx.input.bibleId, ctx.input.chapterId);
      let verses = (result.data || []).map(v => ({
        verseId: v.verseId,
        orgId: v.orgId || '',
        bibleId: v.bibleId,
        bookId: v.bookId,
        chapterId: v.chapterId,
        reference: v.reference || ''
      }));

      return {
        output: {
          verses
        },
        message: `Found **${verses.length}** verse(s) in chapter ${ctx.input.chapterId}.`
      };
    }

    throw new Error(
      'Either chapterId (to list verses) or verseId (to retrieve content) must be provided.'
    );
  })
  .build();
