import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

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

export let fetchPage = SlateTool.create(spec, {
  name: 'Fetch Page',
  key: 'fetch_page',
  description: `Fetch the raw HTTP response from any URL with automatic anti-bot protection handling. Returns the HTTP response body (base64-encoded) and optionally response headers. Supports custom HTTP methods, request headers, request bodies, device emulation, geolocation, and redirect control.

Use this for fetching server-rendered HTML or any HTTP resource. For JavaScript-rendered pages, use the **Render Page** tool instead.`,
  instructions: [
    'The response body is returned base64-encoded. Decode it to get the actual content.',
    'You cannot set the Cookie header via customHttpRequestHeaders — use requestCookies instead.',
    'httpRequestBody (base64) and httpRequestText (UTF-8 string) are mutually exclusive.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Target URL to fetch'),
      httpRequestMethod: z
        .string()
        .optional()
        .describe('HTTP method to use (GET, POST, PUT, etc.). Defaults to GET.'),
      httpRequestText: z
        .string()
        .optional()
        .describe(
          'UTF-8 text request body (e.g. JSON string, form data). Mutually exclusive with httpRequestBody.'
        ),
      httpRequestBody: z
        .string()
        .optional()
        .describe(
          'Base64-encoded binary request body. Mutually exclusive with httpRequestText.'
        ),
      customHttpRequestHeaders: z
        .array(headerSchema)
        .optional()
        .describe('Custom HTTP request headers'),
      includeResponseHeaders: z
        .boolean()
        .optional()
        .describe('Set to true to include HTTP response headers in the result'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type for emulation'),
      followRedirect: z
        .boolean()
        .optional()
        .describe('Whether to follow HTTP redirects. Defaults to true.'),
      geolocation: z
        .string()
        .optional()
        .describe('Country code for request origin (e.g. "US", "GB", "DE")'),
      ipType: z
        .enum(['datacenter', 'residential'])
        .optional()
        .describe('IP address type to use'),
      requestCookies: z
        .array(cookieSchema)
        .optional()
        .describe('Cookies to send with the request'),
      includeResponseCookies: z
        .boolean()
        .optional()
        .describe('Set to true to include response cookies in the result'),
      sessionId: z
        .string()
        .optional()
        .describe(
          'Session ID (UUID) for maintaining the same IP and cookie jar across requests'
        )
    })
  )
  .output(
    z.object({
      url: z.string().describe('Final URL after any redirects'),
      statusCode: z.number().optional().describe('HTTP status code of the response'),
      httpResponseBody: z.string().optional().describe('Base64-encoded HTTP response body'),
      httpResponseHeaders: z.array(headerSchema).optional().describe('HTTP response headers'),
      responseCookies: z.array(cookieSchema).optional().describe('Cookies set by the response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Fetching page via Zyte API...');

    let response = await client.extract({
      url: ctx.input.url,
      httpResponseBody: true,
      httpResponseHeaders: ctx.input.includeResponseHeaders || undefined,
      httpRequestMethod: ctx.input.httpRequestMethod,
      httpRequestText: ctx.input.httpRequestText,
      httpRequestBody: ctx.input.httpRequestBody,
      customHttpRequestHeaders: ctx.input.customHttpRequestHeaders,
      device: ctx.input.device,
      followRedirect: ctx.input.followRedirect,
      geolocation: ctx.input.geolocation,
      ipType: ctx.input.ipType,
      requestCookies: ctx.input.requestCookies,
      responseCookies: ctx.input.includeResponseCookies || undefined,
      session: ctx.input.sessionId ? { id: ctx.input.sessionId } : undefined
    });

    return {
      output: {
        url: response.url,
        statusCode: response.statusCode,
        httpResponseBody: response.httpResponseBody,
        httpResponseHeaders: response.httpResponseHeaders,
        responseCookies: response.responseCookies
      },
      message: `Fetched **${response.url}** — HTTP ${response.statusCode ?? 'unknown'}`
    };
  })
  .build();
