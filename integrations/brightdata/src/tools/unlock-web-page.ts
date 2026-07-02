import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let unlockWebPage = SlateTool.create(spec, {
  name: 'Unlock Web Page',
  key: 'unlock_web_page',
  description: `Fetch the content of any web page, bypassing anti-bot protections, CAPTCHAs, and access restrictions. Uses Bright Data's Web Unlocker to automatically handle proxy rotation, JavaScript rendering, and cookie management. Returns the page content as HTML, Markdown, or raw response.`,
  instructions: [
    'Provide a full URL including the protocol (https://).',
    'Use the "country" parameter to access geo-restricted content from a specific location.',
    'Set "dataFormat" to "markdown" for cleaner text output, or "html" for full page source.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zone: z.string().describe('Name of the Web Unlocker zone configured in Bright Data.'),
      url: z.string().describe('Full URL of the target web page to unlock and fetch.'),
      format: z
        .enum(['raw', 'json'])
        .default('raw')
        .describe(
          'API response format. "raw" returns the site response as-is, "json" returns structured JSON.'
        ),
      country: z
        .string()
        .optional()
        .describe('Two-letter country code (e.g., "us", "gb", "de") for geo-targeted access.'),
      dataFormat: z
        .enum(['html', 'markdown'])
        .optional()
        .describe(
          'Output format for the page content. "html" returns full HTML, "markdown" returns a cleaned markdown version.'
        )
    })
  )
  .output(
    z.object({
      content: z.string().describe('The fetched page content in the requested format.'),
      statusCode: z.number().describe('HTTP status code returned by the target page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });

    let result = await client.unlockUrl({
      zone: ctx.input.zone,
      url: ctx.input.url,
      format: ctx.input.format,
      country: ctx.input.country,
      dataFormat: ctx.input.dataFormat
    });

    let contentPreview =
      result.content.length > 200 ? `${result.content.substring(0, 200)}...` : result.content;

    return {
      output: result,
      message: `Successfully fetched content from **${ctx.input.url}** (status ${result.statusCode}). Content length: ${result.content.length} characters.\n\n\`\`\`\n${contentPreview}\n\`\`\``
    };
  })
  .build();
