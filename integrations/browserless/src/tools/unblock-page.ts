import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';

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
      returnScreenshot: z.boolean().optional().describe('Return a base64-encoded screenshot'),
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
      screenshotBase64: z
        .string()
        .nullable()
        .describe('Base64-encoded screenshot, or null if not requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.unblock({
      url: ctx.input.url,
      content: ctx.input.returnContent,
      cookies: ctx.input.returnCookies,
      screenshot: ctx.input.returnScreenshot,
      ttl: ctx.input.ttl
    });

    let parts: string[] = [];
    if (result.content) parts.push('HTML content');
    if (result.cookies?.length) parts.push(`${result.cookies.length} cookie(s)`);
    if (result.screenshot) parts.push('screenshot');

    return {
      output: {
        pageContent: result.content,
        cookies: result.cookies ?? [],
        screenshotBase64: result.screenshot
      },
      message: `Unblocked ${ctx.input.url}. Retrieved: ${parts.length > 0 ? parts.join(', ') : 'no data (enable return options)'}.`
    };
  })
  .build();
