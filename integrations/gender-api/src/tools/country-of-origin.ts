import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let countryOfOrigin = SlateTool.create(spec, {
  name: 'Country of Origin',
  key: 'country_of_origin',
  description: `Predict the most likely countries of origin for a given name. Returns a ranked list of countries with probability scores, continental regions, and statistical regions. Also includes a link to an interactive map visualization.`,
  instructions: ['Provide exactly one of: firstName, fullName, or email.'],
  constraints: [
    'This feature is experimental and may not deliver consistent quality across all regions.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('A first name to look up (e.g. "Johann")'),
      fullName: z
        .string()
        .optional()
        .describe('A full name to look up (e.g. "Theresa Miller")'),
      email: z.string().optional().describe('An email address to look up')
    })
  )
  .output(
    z.object({
      resultFound: z.boolean().describe('Whether a matching result was found'),
      firstName: z.string().describe('The resolved first name'),
      gender: z.string().describe('Predicted gender for the name'),
      probability: z.number().describe('Gender prediction confidence score'),
      countryOfOrigin: z
        .array(
          z.object({
            countryName: z.string().describe('Full country name (e.g. "Germany")'),
            country: z.string().describe('ISO 3166-1 alpha-2 country code (e.g. "DE")'),
            probability: z
              .number()
              .describe('Probability that the name originates from this country'),
            continentalRegion: z.string().describe('Continental region (e.g. "Europe")'),
            statisticalRegion: z
              .string()
              .describe('Statistical sub-region (e.g. "Western Europe")')
          })
        )
        .describe('Ranked list of likely countries of origin'),
      mapUrl: z.string().describe('URL to an interactive map visualization of the results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (!ctx.input.firstName && !ctx.input.fullName && !ctx.input.email) {
      throw new Error('Provide one of: firstName, fullName, or email.');
    }

    let result = await client.getCountryOfOrigin({
      firstName: ctx.input.firstName,
      fullName: ctx.input.fullName,
      email: ctx.input.email
    });

    let topCountries = result.countryOfOrigin
      .slice(0, 3)
      .map(c => `${c.countryName} (${Math.round(c.probability * 100)}%)`)
      .join(', ');

    return {
      output: {
        resultFound: result.resultFound,
        firstName: result.firstName,
        gender: result.gender,
        probability: result.probability,
        countryOfOrigin: result.countryOfOrigin,
        mapUrl: result.countryOfOriginMapUrl
      },
      message: `**${result.firstName}** most likely originates from: ${topCountries}. [View map](${result.countryOfOriginMapUrl})`
    };
  })
  .build();
