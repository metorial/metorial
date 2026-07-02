import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let searchVerseSchema = z.object({
  verseId: z.string().describe('Verse identifier'),
  orgId: z.string().describe('Original verse identifier'),
  bibleId: z.string().describe('Bible version ID'),
  bookId: z.string().describe('Book ID'),
  chapterId: z.string().describe('Chapter ID'),
  reference: z.string().describe('Human-readable reference'),
  text: z.string().describe('Matched verse text')
});

export let searchBible = SlateTool.create(spec, {
  name: 'Search Bible',
  key: 'search_bible',
  description: `Search for keywords or references within a Bible version. Returns matching verses with their text and references. Supports pagination, sorting, fuzzy matching, and scoping to specific book ranges.`,
  instructions: [
    'Use the "range" parameter to limit search to specific books, e.g., "MAT-REV" for the New Testament, or "GEN" for just Genesis.',
    'Fuzziness controls typo tolerance: "AUTO" adapts based on term length, "0" requires exact match.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bibleId: z.string().describe('The Bible version ID to search within'),
      query: z.string().describe('Search query (keyword or phrase)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 10)'),
      offset: z.number().optional().describe('Number of results to skip for pagination'),
      sort: z
        .enum(['relevance', 'canonical', 'reverse-canonical'])
        .optional()
        .describe('Sort order for results'),
      range: z
        .string()
        .optional()
        .describe('Limit search to a book range (e.g., "MAT-REV", "GEN", "PSA-PRO")'),
      fuzziness: z
        .enum(['AUTO', '0', '1', '2'])
        .optional()
        .describe('Fuzzy matching tolerance')
    })
  )
  .output(
    z.object({
      query: z.string().describe('The search query used'),
      total: z.number().describe('Total number of matching results'),
      verseCount: z.number().describe('Number of matching verses returned'),
      verses: z.array(searchVerseSchema).describe('Matching verses'),
      limit: z.number().describe('Results limit used'),
      offset: z.number().describe('Results offset used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.search(ctx.input.bibleId, {
      query: ctx.input.query,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      range: ctx.input.range,
      fuzziness: ctx.input.fuzziness
    });

    let sr = result.data;
    return {
      output: {
        query: sr.query || ctx.input.query,
        total: sr.total || 0,
        verseCount: sr.verseCount || 0,
        verses: (sr.verses || []).map(v => ({
          verseId: v.verseId,
          orgId: v.orgId || '',
          bibleId: v.bibleId,
          bookId: v.bookId,
          chapterId: v.chapterId,
          reference: v.reference || '',
          text: v.text || ''
        })),
        limit: sr.limit || 10,
        offset: sr.offset || 0
      },
      message: `Found **${sr.total || 0}** result(s) for "${ctx.input.query}". Returned ${(sr.verses || []).length} verse(s).`
    };
  })
  .build();
