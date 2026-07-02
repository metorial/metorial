import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tetraProxySchema = z.object({
  type: z.literal('tetra').describe('Use AgentQL managed proxy infrastructure'),
  countryCode: z
    .string()
    .optional()
    .describe('Two-letter country code for proxy location (e.g. "US", "GB"). Defaults to "US"')
});

let customProxySchema = z.object({
  type: z.literal('custom').describe('Use a custom proxy server'),
  url: z.string().describe('Proxy server URL'),
  username: z.string().optional().describe('Proxy authentication username'),
  password: z.string().optional().describe('Proxy authentication password')
});

export let queryWebPage = SlateTool.create(spec, {
  name: 'Query Web Page',
  key: 'query_web_page',
  description: `Extract structured data from a web page as JSON. Provide a public URL or raw HTML content along with an AgentQL query or natural language prompt to define the data you want.

Use a **structured AgentQL query** (e.g. \`{ products[] { name price } }\`) for precise control over output shape, or a **natural language prompt** for AgentQL to infer the structure automatically.

Supports configurable page load wait times, scrolling, screenshot capture, extraction mode, browser profiles, and proxy settings.`,
  instructions: [
    'Either "url" or "html" must be provided, but not both.',
    'Either "query" or "prompt" must be provided, but not both.',
    'AgentQL queries use a structured syntax like: { products[] { name price(integer) } }',
    'Use "standard" mode for complex or high-volume data extraction; "fast" mode is adequate for most use cases.'
  ],
  constraints: [
    'The URL must be a publicly accessible web page.',
    'Wait time is limited to 0-10 seconds.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('URL of the public web page to query'),
      html: z.string().optional().describe('Raw HTML content to query data from'),
      query: z
        .string()
        .optional()
        .describe(
          'Structured AgentQL query defining the exact output shape (e.g. "{ products[] { name price } }")'
        ),
      prompt: z
        .string()
        .optional()
        .describe(
          'Natural language description of the data to extract; AgentQL infers the structure'
        ),
      waitFor: z
        .number()
        .optional()
        .describe(
          'Seconds to wait for the page to load before querying (0-10). Defaults to 0'
        ),
      scrollToBottom: z
        .boolean()
        .optional()
        .describe(
          'Whether to scroll to the bottom of the page before querying. Defaults to false'
        ),
      mode: z
        .enum(['fast', 'standard'])
        .optional()
        .describe(
          'Extraction mode: "fast" for speed (default), "standard" for deeper analysis'
        ),
      captureScreenshot: z
        .boolean()
        .optional()
        .describe('Whether to capture a screenshot of the page. Defaults to false'),
      browserProfile: z
        .enum(['light', 'stealth'])
        .optional()
        .describe(
          'Browser profile: "light" (default) or "stealth" for enhanced bot detection avoidance'
        ),
      proxy: z
        .union([tetraProxySchema, customProxySchema])
        .optional()
        .describe('Proxy configuration for the request')
    })
  )
  .output(
    z.object({
      extractedData: z
        .record(z.string(), z.unknown())
        .describe('Structured data extracted from the web page matching the query'),
      requestId: z.string().describe('Unique identifier for the request'),
      generatedQuery: z
        .string()
        .optional()
        .describe(
          'The AgentQL query generated from the natural language prompt, if a prompt was used'
        ),
      screenshot: z
        .string()
        .optional()
        .describe('Base64-encoded screenshot of the page, if screenshot capture was enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.queryData({
      url: ctx.input.url,
      html: ctx.input.html,
      query: ctx.input.query,
      prompt: ctx.input.prompt,
      params: {
        waitFor: ctx.input.waitFor,
        isScrollToBottomEnabled: ctx.input.scrollToBottom,
        mode: ctx.input.mode,
        isScreenshotEnabled: ctx.input.captureScreenshot,
        browserProfile: ctx.input.browserProfile,
        proxy: ctx.input.proxy
      }
    });

    let output: {
      extractedData: Record<string, unknown>;
      requestId: string;
      generatedQuery?: string;
      screenshot?: string;
    } = {
      extractedData: result.data,
      requestId: result.metadata.request_id
    };

    if (result.metadata.generated_query) {
      output.generatedQuery = result.metadata.generated_query;
    }

    if (result.metadata.screenshot) {
      output.screenshot = result.metadata.screenshot;
    }

    let source = ctx.input.url ? `**${ctx.input.url}**` : 'provided HTML content';
    let dataKeys = Object.keys(result.data);
    return {
      output,
      message: `Extracted data from ${source}. Retrieved ${dataKeys.length} top-level field(s): ${dataKeys.join(', ')}.`
    };
  })
  .build();
