import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let markdownify = SlateTool.create(spec, {
  name: 'Convert to Markdown',
  key: 'markdownify',
  description: `Converts a webpage into clean, well-formatted Markdown. Strips ads, navigation, and irrelevant elements while preserving content structure, images, and links.
Useful for preparing web content for LLMs, documentation, or content migration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      websiteUrl: z.string().describe('URL of the webpage to convert to Markdown'),
      stealth: z
        .boolean()
        .optional()
        .describe('Enable anti-detection mode for protected sites (adds 4 credits)'),
      waitMs: z
        .number()
        .optional()
        .describe('Milliseconds to wait for page load (default: 3000)'),
      countryCode: z
        .string()
        .optional()
        .describe('ISO country code for proxy routing (e.g., "us", "gb")')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique identifier for this request'),
      status: z.string().describe('Status of the request'),
      result: z.string().describe('Clean Markdown content of the webpage'),
      error: z.string().nullable().optional().describe('Error message if the request failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.markdownify({
      websiteUrl: ctx.input.websiteUrl,
      stealth: ctx.input.stealth,
      waitMs: ctx.input.waitMs,
      countryCode: ctx.input.countryCode
    });

    return {
      output: {
        requestId: response.request_id,
        status: response.status,
        result: response.result,
        error: response.error
      },
      message: `Converted **${ctx.input.websiteUrl}** to Markdown. Status: **${response.status}**.`
    };
  })
  .build();
