import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchPdfText = SlateTool.create(spec, {
  name: 'Search PDF Text',
  key: 'search_pdf_text',
  description: `Search for text within a PDF document and return all matches with their positions. Supports exact text matching, smart matching, and regular expressions.
Returns the text, coordinates, and page index for each match found.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the PDF file to search'),
      searchString: z.string().describe('Text string or regex pattern to search for'),
      pages: z.string().optional().describe('Page indices to search, e.g. "0,1,2" or "0-5"'),
      regexSearch: z.boolean().optional().describe('Enable regular expression matching'),
      wordMatchingMode: z
        .enum(['None', 'SmartMatch', 'ExactMatch'])
        .optional()
        .describe('Word matching mode'),
      password: z.string().optional().describe('Password for protected PDF files')
    })
  )
  .output(
    z.object({
      matches: z
        .array(
          z.object({
            text: z.string().describe('Matched text content'),
            pageIndex: z.number().describe('Page index where the match was found'),
            left: z.number().describe('Left coordinate of the match'),
            top: z.number().describe('Top coordinate of the match'),
            width: z.number().describe('Width of the matched text area'),
            height: z.number().describe('Height of the matched text area')
          })
        )
        .describe('All text matches found'),
      matchCount: z.number().describe('Total number of matches found'),
      pageCount: z.number().describe('Total pages in the document'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.findText({
      url: ctx.input.sourceUrl,
      searchString: ctx.input.searchString,
      pages: ctx.input.pages,
      regexSearch: ctx.input.regexSearch,
      wordMatchingMode: ctx.input.wordMatchingMode,
      password: ctx.input.password
    });

    if (result.error) {
      throw new Error(`Text search failed: ${result.message || 'Unknown error'}`);
    }

    let matches = (result.body || []).map((m: any) => ({
      text: m.text,
      pageIndex: m.pageIndex,
      left: m.left,
      top: m.top,
      width: m.width,
      height: m.height
    }));

    return {
      output: {
        matches,
        matchCount: matches.length,
        pageCount: result.pageCount,
        creditsUsed: result.credits,
        remainingCredits: result.remainingCredits
      },
      message: `Found **${matches.length}** match(es) for "${ctx.input.searchString}" across ${result.pageCount} page(s).`
    };
  })
  .build();
