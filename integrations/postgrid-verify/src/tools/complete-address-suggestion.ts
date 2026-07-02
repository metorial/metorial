import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let completeAddressSuggestion = SlateTool.create(spec, {
  name: 'Complete Address Suggestion',
  key: 'complete_address_suggestion',
  description: `Resolve a full verified address from an autocomplete suggestion. Takes a preview ID from the **Autocomplete Address** tool and returns the complete, standardized address. This is the second step in the autocomplete workflow after getting suggestions.`,
  instructions: [
    'Use a previewId obtained from the Autocomplete Address tool.',
    'Only call this when the user has selected a specific suggestion.'
  ],
  constraints: [
    'Consumes one lookup per call.',
    'Geocoding requires activation by PostGrid support and counts as an additional lookup.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      previewId: z.string().describe('The preview ID from an autocomplete suggestion'),
      geocode: z.boolean().optional().describe('Include latitude/longitude coordinates'),
      properCase: z.boolean().optional().describe('Return address in proper case')
    })
  )
  .output(
    z.object({
      line1: z.string().describe('Primary address line'),
      line2: z.string().optional().describe('Secondary address line'),
      city: z.string().describe('City'),
      provinceOrState: z.string().describe('Province or state'),
      postalOrZip: z.string().describe('Postal or ZIP code'),
      country: z.string().describe('Country code'),
      countryName: z.string().optional().describe('Full country name'),
      zipPlus4: z.string().optional().describe('ZIP+4 code (US only)'),
      status: z.string().optional().describe('Verification status'),
      errors: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('Errors or corrections'),
      geocodeResult: z
        .object({
          location: z.object({
            lat: z.number(),
            lng: z.number()
          }),
          accuracy: z.number(),
          accuracyType: z.string()
        })
        .optional()
        .describe('Geocoding result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.completeAddress(ctx.input.previewId, {
      geocode: ctx.input.geocode,
      properCase: ctx.input.properCase
    });

    return {
      output: result,
      message: `Resolved address: ${result.line1}, ${result.city}, ${result.provinceOrState} ${result.postalOrZip}, ${result.country.toUpperCase()}.`
    };
  })
  .build();
