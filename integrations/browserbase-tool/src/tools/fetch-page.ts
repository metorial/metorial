import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let fetchPage = SlateTool.create(spec, {
  name: 'Fetch Page',
  key: 'fetch_page',
  description: `Fetch a web page through Browserbase's cloud infrastructure. Returns the page content, headers, status code, and content type. Supports proxy routing and redirect following.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to fetch'),
      allowRedirects: z
        .boolean()
        .optional()
        .describe('Follow HTTP redirects (default: false)'),
      allowInsecureSsl: z
        .boolean()
        .optional()
        .describe('Bypass TLS certificate verification (default: false)'),
      enableProxy: z.boolean().optional().describe('Enable proxy support (default: false)')
    })
  )
  .output(
    z.object({
      fetchId: z.string().describe('Unique fetch request identifier'),
      statusCode: z.number().describe('HTTP status code of the fetched response'),
      headers: z.record(z.string(), z.string()).describe('Response headers'),
      content: z.string().describe('Response body content'),
      contentType: z.string().describe('MIME type of the response'),
      encoding: z.string().describe('Character encoding')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.fetchPage({
      url: ctx.input.url,
      allowRedirects: ctx.input.allowRedirects,
      allowInsecureSsl: ctx.input.allowInsecureSsl,
      proxies: ctx.input.enableProxy
    });

    return {
      output: {
        fetchId: result.fetchId,
        statusCode: result.statusCode,
        headers: result.headers,
        content: result.content,
        contentType: result.contentType,
        encoding: result.encoding
      },
      message: `Fetched **${ctx.input.url}** with status **${result.statusCode}** (${result.contentType}).`
    };
  })
  .build();
