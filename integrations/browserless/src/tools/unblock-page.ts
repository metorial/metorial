import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';
import { base64ByteLength, base64FileAttachment, requireHttpUrl } from './shared';

export let unblockPage = SlateTool.create(spec, {
  name: 'Unblock Page',
  key: 'unblock_page',
  description: `Access a protected web page by bypassing basic bot detection mechanisms. Returns the page content, cookies, and/or a screenshot after unblocking. Useful for sites that block standard headless browser requests. For sites with advanced protections or interactive CAPTCHAs, BrowserQL may be needed instead.`,
  instructions: [
    'Enable the specific return types you need (content, cookies, screenshot) to control what data is returned.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the protected page to access'),
      returnContent: z.boolean().optional().describe('Return the full HTML page content'),
      returnCookies: z.boolean().optional().describe('Return cookies from the session'),
      returnScreenshot: z
        .boolean()
        .optional()
        .describe('Return a screenshot as a Slate attachment'),
      returnBrowserWSEndpoint: z
        .boolean()
        .optional()
        .describe('Return a Browserless WebSocket endpoint for the unblocked browser session'),
      proxy: z
        .enum(['residential', 'datacenter'])
        .optional()
        .describe('Proxy network to route through when unblocking'),
      ttl: z.number().optional().describe('Session time-to-live in milliseconds')
    })
  )
  .output(
    z.object({
      pageContent: z
        .string()
        .nullable()
        .describe('HTML content of the unblocked page, or null if not requested'),
      cookies: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
            domain: z.string(),
            path: z.string(),
            httpOnly: z.boolean(),
            secure: z.boolean()
          })
        )
        .describe('Cookies from the session'),
      browserWSEndpoint: z
        .string()
        .nullable()
        .describe('Browserless WebSocket endpoint, or null if not requested'),
      screenshotMimeType: z
        .string()
        .optional()
        .describe('MIME type of the screenshot attachment, when returned'),
      screenshotByteLength: z
        .number()
        .optional()
        .describe('Decoded byte length of the screenshot attachment, when returned'),
      attachmentCount: z.number().describe('Number of Slate attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    requireHttpUrl(ctx.input.url);

    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.unblock(
      {
        url: ctx.input.url,
        content: ctx.input.returnContent,
        cookies: ctx.input.returnCookies,
        screenshot: ctx.input.returnScreenshot,
        browserWSEndpoint: ctx.input.returnBrowserWSEndpoint,
        ttl: ctx.input.ttl
      },
      {
        proxy: ctx.input.proxy
      }
    );

    let parts: string[] = [];
    if (result.content) parts.push('HTML content');
    if (result.cookies?.length) parts.push(`${result.cookies.length} cookie(s)`);
    if (result.screenshot) parts.push('screenshot');
    if (result.browserWSEndpoint) parts.push('browser WebSocket endpoint');

    let attachments = result.screenshot
      ? [base64FileAttachment(result.screenshot, 'image/png')]
      : [];

    return {
      output: {
        pageContent: result.content ?? null,
        cookies: result.cookies ?? [],
        browserWSEndpoint: result.browserWSEndpoint ?? null,
        screenshotMimeType: result.screenshot ? 'image/png' : undefined,
        screenshotByteLength: result.screenshot
          ? base64ByteLength(result.screenshot)
          : undefined,
        attachmentCount: attachments.length
      },
      attachments,
      message: `Unblocked ${ctx.input.url}. Retrieved: ${parts.length > 0 ? parts.join(', ') : 'no data (enable return options)'}.`
    };
  })
  .build();
