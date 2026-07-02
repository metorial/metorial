import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeIdealista = SlateTool.create(spec, {
  name: 'Scrape Idealista Property',
  key: 'scrape_idealista',
  description: `Extract structured property data from Idealista by property ID. Returns comprehensive real estate listing details including address, price, bedrooms, bathrooms, geolocation, images, agency/agent information, features, equipment, and energy certification.`,
  instructions: [
    'The **propertyId** is found in the Idealista URL (e.g. in "https://www.idealista.com/inmueble/1234567890", the ID is "1234567890").',
    'Use **tld** to target different country domains: ".com" (Spain), ".it" (Italy), ".pt" (Portugal).',
    'Use **lang** to get results in a specific language.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      propertyId: z.string().describe('Unique Idealista property ID from the listing URL'),
      tld: z
        .string()
        .optional()
        .describe('Top-level domain: ".com" (Spain), ".it" (Italy), ".pt" (Portugal)'),
      lang: z
        .string()
        .optional()
        .describe('Language code for results (e.g. "en", "es", "it", "pt", "fr", "de")')
    })
  )
  .output(
    z.object({
      results: z
        .record(z.string(), z.unknown())
        .describe('Structured property data from Idealista')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.getIdealistaProperty({
      propertyId: ctx.input.propertyId,
      tld: ctx.input.tld,
      lang: ctx.input.lang
    });

    return {
      output: { results },
      message: `Retrieved Idealista property data for ID **${ctx.input.propertyId}**.`
    };
  })
  .build();
