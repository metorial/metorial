import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';
import {
  base64ByteLength,
  base64FileAttachment,
  requireHttpUrl,
  requireSmartScrapeSuccess
} from './shared';

export let smartScrape = SlateTool.create(spec, {
  name: 'Smart Scrape',
  key: 'smart_scrape',
  description: `Scrape a URL with Browserless Smart Scrape. Browserless automatically escalates from fast HTTP fetching to proxying, headless browser rendering, and page-gating CAPTCHA solving as needed. Returns requested HTML, markdown, links, and optional file attachments for screenshots or PDFs.`,
  instructions: [
    'Use formats to request only the outputs you need.',
    'Screenshot and PDF formats are returned through Slate attachments, not inline base64 fields.',
    'Use BrowserQL instead for submitting forms behind embedded CAPTCHAs.'
  ],
  constraints: [
    'Smart Scrape may consume more units when it escalates to browser or proxy strategies.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('HTTP or HTTPS URL to scrape'),
      formats: z
        .array(z.enum(['html', 'markdown', 'screenshot', 'pdf', 'links']))
        .optional()
        .describe('Output formats to include; defaults to Browserless html output'),
      proxy: z
        .enum(['residential', 'datacenter'])
        .optional()
        .describe('Proxy network to route the scrape through'),
      timeout: z
        .number()
        .optional()
        .describe('Maximum milliseconds allowed for each Smart Scrape strategy attempt'),
      profile: z
        .string()
        .optional()
        .describe('Saved Browserless authenticated profile name to load before navigating')
    })
  )
  .output(
    z.object({
      ok: z.boolean().optional().describe('Whether Browserless reported success'),
      statusCode: z.number().nullable().optional().describe('Target URL HTTP status code'),
      content: z.any().optional().describe('Scraped HTML string or parsed JSON object'),
      contentType: z.string().nullable().optional().describe('Target content type'),
      headers: z.record(z.string(), z.string()).optional().describe('Target response headers'),
      strategy: z.string().optional().describe('Strategy that produced the scrape result'),
      attempted: z
        .array(z.string())
        .optional()
        .describe('Strategies attempted by Browserless'),
      message: z
        .string()
        .nullable()
        .optional()
        .describe('Browserless error or status message'),
      markdown: z.string().nullable().optional().describe('Markdown output, when requested'),
      links: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('Links output, when requested'),
      screenshotMimeType: z.string().optional().describe('Screenshot attachment MIME type'),
      screenshotByteLength: z
        .number()
        .optional()
        .describe('Screenshot attachment byte length'),
      pdfMimeType: z.string().optional().describe('PDF attachment MIME type'),
      pdfByteLength: z.number().optional().describe('PDF attachment byte length'),
      attachmentCount: z.number().describe('Number of Slate attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    requireHttpUrl(ctx.input.url);

    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.smartScrape(
      {
        url: ctx.input.url,
        formats: ctx.input.formats,
        proxy: ctx.input.proxy
      },
      {
        timeout: ctx.input.timeout,
        profile: ctx.input.profile
      }
    );
    requireSmartScrapeSuccess(result);

    let attachments: ReturnType<typeof base64FileAttachment>[] = [];
    if (result.screenshot) {
      attachments.push(base64FileAttachment(result.screenshot, 'image/png'));
    }
    if (result.pdf) {
      attachments.push(base64FileAttachment(result.pdf, 'application/pdf'));
    }

    return {
      output: {
        ok: result.ok,
        statusCode: result.statusCode,
        content: result.content,
        contentType: result.contentType,
        headers: result.headers,
        strategy: result.strategy,
        attempted: result.attempted,
        message: result.message,
        markdown: result.markdown,
        links: result.links,
        screenshotMimeType: result.screenshot ? 'image/png' : undefined,
        screenshotByteLength: result.screenshot
          ? base64ByteLength(result.screenshot)
          : undefined,
        pdfMimeType: result.pdf ? 'application/pdf' : undefined,
        pdfByteLength: result.pdf ? base64ByteLength(result.pdf) : undefined,
        attachmentCount: attachments.length
      },
      attachments,
      message: `Smart scraped ${ctx.input.url} with strategy ${result.strategy ?? 'unknown'}.`
    };
  })
  .build();
