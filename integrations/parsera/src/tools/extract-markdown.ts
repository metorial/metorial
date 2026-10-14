import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cookieSchema } from '../lib/schemas';
import { spec } from '../spec';

export let extractMarkdownTool = SlateTool.create(spec, {
  name: 'Extract Markdown',
  key: 'extract_markdown',
  description: `Convert any web page into markdown format by providing its URL. Returns the full page content as clean markdown text and a downloadable Markdown file.
Supports proxy configuration for geo-restricted pages and cookies for authenticated pages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the web page to convert to markdown'),
      proxyCountry: z
        .string()
        .optional()
        .describe('Geographic location for proxy routing, e.g. "UnitedStates"'),
      cookies: z
        .array(cookieSchema)
        .optional()
        .describe('Cookies to send with the request for authenticated or session-based pages')
    })
  )
  .output(
    z.object({
      markdown: z.string().describe('The web page content converted to markdown format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let markdown = await client.extractMarkdown({
      url: ctx.input.url,
      proxyCountry: ctx.input.proxyCountry,
      cookies: ctx.input.cookies
    });

    await ctx.addAttachment({
      type: 'content',
      content: new Response(markdown, {
        headers: { 'content-type': 'text/markdown; charset=utf-8' }
      }),
      filename: 'page.md'
    });

    return {
      output: { markdown },
      message: `Converted ${ctx.input.url} to markdown (${markdown.length} characters)`
    };
  })
  .build();
