import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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

    return {
      output: {
        publicationName: fp.name,
        date: fp.date,
        language: fp.language,
        country: fp.country,
        imageUrl: fp.image
      },
      message: `Retrieved front page for **${fp.name}** (${fp.country}) on ${fp.date}. [View image](${fp.image})`
    };
  })
  .build();
