import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { scriptureContent } from '../lib/content';
import { spec } from '../spec';

let sectionSchema = z.object({
  sectionId: z.string().describe('Unique section identifier'),
  bibleId: z.string().describe('Bible version ID'),
  bookId: z.string().describe('Book ID'),
  chapterId: z.string().optional().describe('Chapter ID when supplied by the provider'),
  firstVerseId: z.string().optional().describe('First verse in the section'),
  lastVerseId: z.string().optional().describe('Last verse in the section'),
  firstVerseOrgId: z.string().optional().describe('Original first verse ID'),
  lastVerseOrgId: z.string().optional().describe('Original last verse ID'),
  title: z.string().describe('Section title (e.g., "The Birth of Jesus Christ")')
});

export let getSections = SlateTool.create(spec, {
  name: 'Get Sections',
  key: 'get_sections',
  description: `Retrieve thematic sections of scripture for a book, chapter, or specific section. Sections provide named groupings of verses (e.g., "The Birth of Jesus Christ") that can span chapter boundaries. When a section ID is provided, returns the full content of that section.`,
  instructions: [
    'Provide either a bookId to list all sections in a book, or a chapterId to list sections in a chapter, or a sectionId to get full section content.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bibleId: z.string().describe('The Bible version ID'),
      bookId: z.string().optional().describe('Book ID to list all sections in that book'),
      chapterId: z.string().optional().describe('Chapter ID to list sections in that chapter'),
      sectionId: z.string().optional().describe('Specific section ID to retrieve content'),
      parallels: z
        .string()
        .optional()
        .describe('Comma-separated Bible IDs to return parallel scripture from'),
      contentType: z
        .enum(['html', 'json', 'text'])
        .optional()
        .describe('Content format when retrieving a specific section'),
      includeVerseSpans: z.boolean().optional().describe('Include verse spans in content'),
      includeNotes: z.boolean().optional().describe('Include footnotes'),
      includeTitles: z.boolean().optional().describe('Include section titles'),
      includeChapterNumbers: z.boolean().optional().describe('Include chapter numbers'),
      includeVerseNumbers: z.boolean().optional().describe('Include verse numbers')
    })
  )
  .output(
    z.object({
      sections: z.array(sectionSchema).optional().describe('List of sections (when listing)'),
      sectionId: z.string().optional().describe('Section ID (when retrieving content)'),
      title: z.string().optional().describe('Section title'),
      content: z.string().optional().describe('Section scripture content'),
      copyright: z.string().optional().describe('Copyright information'),
      fumsToken: z.string().optional().describe('Current FUMS token for scripture engagement'),
      meta: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Original scripture response metadata'),
      fumsId: z.string().optional().describe('FUMS tracking token')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.sectionId) {
      let result = await client.getSection(ctx.input.bibleId, ctx.input.sectionId, {
        contentType: ctx.input.contentType,
        parallels: ctx.input.parallels,
        includeNotes: ctx.input.includeNotes,
        includeVerseSpans: ctx.input.includeVerseSpans,
        includeTitles: ctx.input.includeTitles,
        includeChapterNumbers: ctx.input.includeChapterNumbers,
        includeVerseNumbers: ctx.input.includeVerseNumbers
      });
      let s = result.data;
      return {
        output: {
          sectionId: s.id,
          title: s.title,
          content: scriptureContent(s.content),
          copyright: s.copyright,
          fumsToken: result.meta?.fumsToken,
          meta: result.meta,
          fumsId: result.meta?.fumsId
        },
        message: `Retrieved section: **${s.title}**`
      };
    }

    if (ctx.input.chapterId) {
      let result = await client.getChapterSections(ctx.input.bibleId, ctx.input.chapterId);
      let sections = result.data.map(s => ({
        sectionId: s.id,
        bibleId: s.bibleId,
        bookId: s.bookId,
        chapterId: s.chapterId,
        firstVerseId: s.firstVerseId,
        lastVerseId: s.lastVerseId,
        firstVerseOrgId: s.firstVerseOrgId,
        lastVerseOrgId: s.lastVerseOrgId,
        title: s.title
      }));
      return {
        output: { sections },
        message: `Found **${sections.length}** section(s) in chapter ${ctx.input.chapterId}.`
      };
    }

    if (ctx.input.bookId) {
      let result = await client.getSections(ctx.input.bibleId, ctx.input.bookId);
      let sections = result.data.map(s => ({
        sectionId: s.id,
        bibleId: s.bibleId,
        bookId: s.bookId,
        chapterId: s.chapterId,
        firstVerseId: s.firstVerseId,
        lastVerseId: s.lastVerseId,
        firstVerseOrgId: s.firstVerseOrgId,
        lastVerseOrgId: s.lastVerseOrgId,
        title: s.title
      }));
      return {
        output: { sections },
        message: `Found **${sections.length}** section(s) in book ${ctx.input.bookId}.`
      };
    }

    throw createApiServiceError(
      'At least one of bookId, chapterId, or sectionId must be provided.'
    );
  })
  .build();
