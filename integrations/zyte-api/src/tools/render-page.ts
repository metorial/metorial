import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let selectorSchema = z.object({
  type: z.enum(['css', 'xpath']).describe('Selector type'),
  value: z.string().describe('Selector query string'),
  state: z
    .enum(['attached', 'visible', 'hidden'])
    .optional()
    .describe('Element state to wait for. Defaults to "visible".')
});

let actionSchema = z.object({
  action: z
    .enum([
      'click',
      'type',
      'scroll',
      'scrollBottom',
      'waitForSelector',
      'waitForTimeout',
      'waitForRequest',
      'waitForResponse',
      'evaluate',
      'select',
      'setInputFiles'
    ])
    .describe('Action type to perform'),
  selector: selectorSchema.optional().describe('Element selector for targeted actions'),
  text: z.string().optional().describe('Text to type (for "type" action)'),
  timeout: z.number().optional().describe('Timeout in milliseconds for wait actions'),
  delay: z
    .number()
    .optional()
    .describe('Delay in milliseconds between keystrokes (for "type" action)'),
  url: z
    .string()
    .optional()
    .describe('URL pattern to wait for (for waitForRequest/waitForResponse actions)'),
  source: z
    .string()
    .optional()
    .describe('JavaScript code to evaluate (for "evaluate" action)'),
  onError: z
    .enum(['return', 'ignore'])
    .optional()
    .describe('Error handling: "return" stops and returns error, "ignore" continues')
});

let networkCaptureSchema = z.object({
  filterType: z.enum(['url']).optional().describe('Filter type for network capture'),
  matchType: z
    .enum(['contains', 'startsWith', 'endsWith', 'exact', 'regex'])
    .optional()
    .describe('How to match the filter value'),
  value: z.string().optional().describe('Value to match against'),
  httpResponseBody: z.boolean().optional().describe('Capture response body'),
  httpResponseHeaders: z.boolean().optional().describe('Capture response headers')
});

let cookieSchema = z.object({
  name: z.string().describe('Cookie name'),
  value: z.string().describe('Cookie value'),
  domain: z.string().optional().describe('Cookie domain'),
  path: z.string().optional().describe('Cookie path')
});

let headerSchema = z.object({
  name: z.string().describe('Header name'),
  value: z.string().describe('Header value')
});

export let renderPage = SlateTool.create(spec, {
  name: 'Render Page',
  key: 'render_page',
  description: `Render a web page in a headless browser and retrieve the fully rendered HTML. Handles JavaScript-rendered content, supports browser actions (clicking, typing, scrolling, waiting, evaluating JS), network capture, and optional screenshots.

Use this when pages rely on JavaScript to load content. For static/server-rendered pages, the **Fetch Page** tool is faster and cheaper.`,
  instructions: [
    'Browser requests only support the Referer request header, not arbitrary custom headers.',
    'Total browser execution time is limited to 60 seconds.',
    'Selectors cannot interact with iframes or shadow DOM — use the "evaluate" action for those.',
    'Use scrollBottom to load lazy/infinite-scroll content before extracting HTML.'
  ],
  constraints: ['Browser execution time is limited to 60 seconds total.'],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Target URL to render'),
      actions: z
        .array(actionSchema)
        .optional()
        .describe('Browser actions to perform before capturing output'),
      networkCapture: z
        .array(networkCaptureSchema)
        .optional()
        .describe('Rules for capturing background network requests'),
      javascript: z
        .boolean()
        .optional()
        .describe('Enable or disable JavaScript execution. Defaults to true.'),
      includeIframes: z
        .boolean()
        .optional()
        .describe('Embed iframe content in the returned HTML'),
      referer: z.string().optional().describe('Referer header value for the browser request'),
      includeScreenshot: z
        .boolean()
        .optional()
        .describe('Also capture a screenshot of the rendered page'),
      fullPageScreenshot: z
        .boolean()
        .optional()
        .describe('Capture full page screenshot instead of viewport only'),
      geolocation: z
        .string()
        .optional()
        .describe('Country code for request origin (e.g. "US", "GB")'),
      ipType: z
        .enum(['datacenter', 'residential'])
        .optional()
        .describe('IP address type to use'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type for emulation'),
      requestCookies: z
        .array(cookieSchema)
        .optional()
        .describe('Cookies to send with the request'),
      includeResponseCookies: z
        .boolean()
        .optional()
        .describe('Include response cookies in the result'),
      sessionId: z
        .string()
        .optional()
        .describe('Session ID (UUID) for maintaining state across requests')
    })
  )
  .output(
    z.object({
      url: z.string().describe('Final URL after any redirects'),
      statusCode: z.number().optional().describe('HTTP status code'),
      browserHtml: z.string().optional().describe('Fully rendered HTML of the page'),
      screenshot: z.string().optional().describe('Base64-encoded PNG screenshot'),
      actionResults: z
        .array(
          z.object({
            action: z.string().describe('Action type that was performed'),
            elapsedTime: z.number().optional().describe('Time taken in milliseconds'),
            error: z.string().optional().describe('Error message if the action failed'),
            status: z.string().optional().describe('Action status')
          })
        )
        .optional()
        .describe('Results of browser actions'),
      networkCapture: z
        .array(
          z.object({
            url: z.string().describe('Captured request URL'),
            method: z.string().optional().describe('HTTP method'),
            statusCode: z.number().optional().describe('Response status code'),
            httpResponseBody: z
              .string()
              .optional()
              .describe('Base64-encoded captured response body'),
            httpResponseHeaders: z
              .array(headerSchema)
              .optional()
              .describe('Captured response headers')
          })
        )
        .optional()
        .describe('Captured network requests'),
      responseCookies: z.array(cookieSchema).optional().describe('Cookies set during browsing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Rendering page in headless browser...');

    let response = await client.extract({
      url: ctx.input.url,
      browserHtml: true,
      screenshot: ctx.input.includeScreenshot || undefined,
      screenshotOptions: ctx.input.fullPageScreenshot ? { fullPage: true } : undefined,
      actions: ctx.input.actions,
      networkCapture: ctx.input.networkCapture,
      javascript: ctx.input.javascript,
      includeIframes: ctx.input.includeIframes,
      requestHeaders: ctx.input.referer ? { referer: ctx.input.referer } : undefined,
      geolocation: ctx.input.geolocation,
      ipType: ctx.input.ipType,
      device: ctx.input.device,
      requestCookies: ctx.input.requestCookies,
      responseCookies: ctx.input.includeResponseCookies || undefined,
      session: ctx.input.sessionId ? { id: ctx.input.sessionId } : undefined
    });

    let actionResults = response.actions?.map(a => ({
      action: a.action,
      elapsedTime: a.elapsedTime,
      error: a.error,
      status: a.status
    }));

    let htmlLength = response.browserHtml?.length ?? 0;

    return {
      output: {
        url: response.url,
        statusCode: response.statusCode,
        browserHtml: response.browserHtml,
        screenshot: response.screenshot,
        actionResults,
        networkCapture: response.networkCapture,
        responseCookies: response.responseCookies
      },
      message: `Rendered **${response.url}** — ${htmlLength} characters of HTML${ctx.input.includeScreenshot ? ', screenshot captured' : ''}${actionResults?.length ? `, ${actionResults.length} action(s) executed` : ''}`
    };
  })
  .build();
