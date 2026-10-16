import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, quotaSchema } from '../lib/client';
import { validateWebsiteUrl } from '../lib/privacy';
import { spec } from '../spec';

export let newspaperFrontPagesTool = SlateTool.create(spec, {
  name: 'Newspaper Front Page',
  key: 'newspaper_front_page',
  description: `Retrieve the front page image of a newspaper publication. Access front pages from over 6,000 publications across 125+ countries. Filter by country, publication name, and date. Useful for getting a visual snapshot of what matters in a given country on a given day.`,
  instructions: [
    'Leave all parameters empty to get a random front page.',
    'Historical data is available from 2024-07-09 onwards.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceCountry: z
        .string()
        .optional()
        .describe('ISO 3166 country code (e.g. "us", "au", "gb")'),
      sourceName: z
        .string()
        .optional()
        .describe('Publication identifier (e.g. "herald-sun", "new-york-times")'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format (earliest: 2024-07-09)')
    })
  )
  .output(
    z.object({
      quota: quotaSchema.optional().describe('API point usage, when returned by the provider'),
      publicationName: z.string().describe('Name of the newspaper'),
      date: z.string().describe('Date of the front page'),
      language: z.string().describe('Language of the publication'),
      country: z.string().describe('Country of the publication'),
      imageUrl: z.string().describe('URL of the front page image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.retrieveFrontPage({
      sourceCountry: ctx.input.sourceCountry,
      sourceName: ctx.input.sourceName,
      date: ctx.input.date
    });

    let fp = result.front_page;
    validateWebsiteUrl(fp.image, ctx.auth.token);
    await ctx.addAttachment({ type: 'url', url: fp.image });

    return {
      output: {
        ...(result.quota ? { quota: result.quota } : {}),
        publicationName: fp.name,
        date: fp.date,
        language: fp.language,
        country: fp.country,
        imageUrl: fp.image
      },
      message: `Prepared the front page image for **${fp.name}** (${fp.country}) on ${fp.date}. [View image](${fp.image})`
    };
  })
  .build();
