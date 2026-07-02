import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeWebPage = SlateTool.create(spec, {
  name: 'Scrape Web Page',
  key: 'scrape_web_page',
  description: `Extract content from any web page and receive it in clean markdown format. Returns the page content, name, description, and character count.
Useful for converting web pages into structured text for processing or analysis.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the web page to scrape'),
      excludeLinks: z
        .boolean()
        .optional()
        .describe('If true, exclude links from the scraped markdown content'),
      lang: z.string().optional().describe('Preferred language (ISO 639-1 code)')
    })
  )
  .output(
    z.object({
      url: z.string().optional().describe('URL of the scraped page'),
      content: z.string().optional().describe('Page content in clean markdown format'),
      pageName: z.string().optional().describe('Name/title of the page'),
      pageDescription: z
        .string()
        .optional()
        .describe('Description/meta description of the page'),
      characterCount: z.number().optional().describe('Number of characters in the content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.scrapeWebPage({
      url: ctx.input.url,
      noLinks: ctx.input.excludeLinks,
      lang: ctx.input.lang
    });

    return {
      output: {
        url: result.url,
        content: result.content,
        pageName: result.name ?? result.pageName,
        pageDescription: result.description ?? result.pageDescription,
        characterCount: result.characterCount ?? result.content?.length
      },
      message: `Scraped **${result.name ?? result.pageName ?? ctx.input.url}** — ${result.characterCount ?? result.content?.length ?? 0} characters of content extracted.`
    };
  })
  .build();
