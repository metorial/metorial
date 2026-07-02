import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let fetchWebpage = SlateTool.create(spec, {
  name: 'Fetch Webpage Content',
  key: 'fetch_webpage',
  description: `Fetch the content of a webpage as HTML or Markdown. Can be used standalone (without a session) or within an existing session for pages that require authentication or specific browser state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the webpage to fetch'),
      format: z
        .enum(['html', 'markdown'])
        .optional()
        .describe('Output format (default: html)'),
      waitMs: z
        .number()
        .optional()
        .describe('Milliseconds to wait after page load before extracting content'),
      sessionId: z
        .string()
        .optional()
        .describe('Existing session ID to use (for authenticated pages)'),
      newPage: z.boolean().optional().describe('Open URL in a new page within the session'),
      pageIndex: z.number().optional().describe('Index of the page tab to use in the session'),
      returnPartialOnTimeout: z
        .boolean()
        .optional()
        .describe('Return partial content if the page times out')
    })
  )
  .output(
    z.object({
      content: z.string().describe('Extracted webpage content in the requested format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let result = await client.fetchWebpage(
      {
        url: input.url,
        format: input.format,
        wait: input.waitMs,
        new_page: input.newPage,
        page_index: input.pageIndex,
        return_partial_on_timeout: input.returnPartialOnTimeout
      },
      input.sessionId
    );

    let contentPreview = result.content?.substring(0, 200) ?? '';

    return {
      output: {
        content: result.content
      },
      message: `Fetched content from **${input.url}** (${result.content?.length ?? 0} chars). Preview: ${contentPreview}...`
    };
  })
  .build();
