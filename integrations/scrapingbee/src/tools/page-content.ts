import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pageContent = SlateTool.create(spec, {
  name: 'Get Page Text or Markdown',
  key: 'page_content',
  description:
    'Retrieve a web page as plain text or Markdown for reading, summarizing, or further analysis. Supports JavaScript rendering and geo-targeted proxies.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      url: z.string().describe('Full URL of the page to retrieve'),
      format: z.enum(['text', 'markdown']).describe('Return plain text or Markdown'),
      renderJs: z.boolean().optional().describe('Render JavaScript; defaults to true'),
      premiumProxy: z.boolean().optional().describe('Use premium proxies'),
      countryCode: z.string().optional().describe('Two-letter proxy country code'),
      wait: z.number().optional().describe('Additional wait after page load, in milliseconds'),
      waitFor: z
        .string()
        .optional()
        .describe('CSS selector to wait for before returning content')
    })
  )
  .output(
    z.object({
      url: z.string(),
      format: z.enum(['text', 'markdown']),
      content: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.scrapeWebpage({
      url: ctx.input.url,
      returnPageText: ctx.input.format === 'text',
      returnPageMarkdown: ctx.input.format === 'markdown',
      renderJs: ctx.input.renderJs,
      premiumProxy: ctx.input.premiumProxy,
      countryCode: ctx.input.countryCode,
      wait: ctx.input.wait,
      waitFor: ctx.input.waitFor
    });
    let content = typeof result === 'string' ? result : JSON.stringify(result);
    return {
      output: { url: ctx.input.url, format: ctx.input.format, content },
      message: `Retrieved ${ctx.input.format} content from **${ctx.input.url}**.`
    };
  });
