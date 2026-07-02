import { SlateTool } from 'slates';
import { z } from 'zod';
import { CuttlyClient, getShortenStatusMessage } from '../lib/client';
import { spec } from '../spec';

export let shortenUrl = SlateTool.create(spec, {
  name: 'Shorten URL',
  key: 'shorten_url',
  description: `Create a shortened URL from a long URL using Cutt.ly. Supports custom aliases (back-half), branded/custom domains, public click stats, and disabling page title fetching for faster responses.`,
  instructions: [
    'The URL to shorten must be a valid, properly formatted URL.',
    'Custom aliases are subject to availability — if already taken, the request will fail.',
    'Branded/custom domains require a paid subscription with an approved, active domain.'
  ],
  constraints: [
    'Rate limits vary by plan: 3 calls/60s (Free) up to 360 calls/60s (Enterprise).',
    'The noTitle option is only available on Team Enterprise plans.',
    'Public click stats require a Single plan or higher.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('The long URL to shorten. Must be a valid URL.'),
      alias: z
        .string()
        .optional()
        .describe('Custom short link alias (back-half). Must not already be taken.'),
      useBrandedDomain: z
        .boolean()
        .optional()
        .describe(
          'Use your branded/custom domain instead of cutt.ly. Requires a paid subscription with an approved domain.'
        ),
      publicStats: z
        .boolean()
        .optional()
        .describe('Make click statistics publicly accessible. Available from Single plan.'),
      noTitle: z
        .boolean()
        .optional()
        .describe(
          'Disable page title fetching for faster response. Available on Team Enterprise plan only.'
        )
    })
  )
  .output(
    z.object({
      shortLink: z.string().describe('The shortened URL'),
      fullLink: z.string().describe('The original long URL'),
      title: z.string().describe('Page title of the original URL'),
      createdAt: z.string().describe('Date when the short link was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CuttlyClient({
      apiKey: ctx.auth.token,
      apiType: ctx.config.apiType
    });

    let result = await client.shortenUrl({
      url: ctx.input.url,
      name: ctx.input.alias,
      userDomain: ctx.input.useBrandedDomain,
      publicStats: ctx.input.publicStats,
      noTitle: ctx.input.noTitle
    });

    if (result.status !== 7) {
      let statusMsg = getShortenStatusMessage(result.status);
      throw new Error(`Failed to shorten URL: ${statusMsg}`);
    }

    return {
      output: {
        shortLink: result.shortLink,
        fullLink: result.fullLink,
        title: result.title,
        createdAt: result.date
      },
      message: `Shortened **${result.fullLink}** → **${result.shortLink}**`
    };
  })
  .build();
