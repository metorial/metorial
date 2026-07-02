import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let completeInternationalAddressSuggestion = SlateTool.create(spec, {
  name: 'Complete International Address Suggestion',
  key: 'complete_international_address_suggestion',
  description: `Resolve a full international address from an autocomplete suggestion. Takes a preview ID from the **Autocomplete International Address** tool and returns the complete, standardized address.`,
  instructions: ['Use a previewId obtained from the Autocomplete International Address tool.'],
  constraints: ['Consumes one lookup per call.', 'Geographic data uses an additional lookup.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      previewId: z
        .string()
        .describe('Preview ID from an international autocomplete suggestion'),
      geoData: z.boolean().optional().describe('Include latitude/longitude coordinates'),
      properCase: z.boolean().optional().describe('Return address in proper case')
    })
  )
  .output(
    z.object({
      formattedAddress: z.string().optional().describe('Full formatted address'),
      line1: z.string().optional().describe('Address line 1'),
      line2: z.string().optional().describe('Address line 2'),
      line3: z.string().optional().describe('Address line 3'),
      line4: z.string().optional().describe('Address line 4'),
      city: z.string().optional().describe('City'),
      provinceOrState: z.string().optional().describe('Province or state'),
      postalOrZip: z.string().optional().describe('Postal code'),
      country: z.string().optional().describe('Country code'),
      building: z.string().optional().describe('Building name or number'),
      department: z.string().optional().describe('Department'),
      company: z.string().optional().describe('Company name'),
      errors: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('Errors or corrections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.completeIntlAddress(ctx.input.previewId, {
      geoData: ctx.input.geoData,
      properCase: ctx.input.properCase
    });

    let displayAddress =
      result.formattedAddress ||
      [result.line1, result.city, result.provinceOrState, result.postalOrZip, result.country]
        .filter(Boolean)
        .join(', ');

    return {
      output: result,
      message: `Resolved international address: ${displayAddress}.`
    };
  })
  .build();
