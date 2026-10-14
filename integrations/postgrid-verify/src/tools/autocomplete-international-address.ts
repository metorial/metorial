import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type IntlAutocompletePreview } from '../lib/client';
import { spec } from '../spec';

let intlPreviewSchema = z.object({
  previewId: z.string().describe('Unique ID for selecting this suggestion or drilling down'),
  type: z.string().describe('Type of result (Address or BuildingNumber)'),
  text: z.string().describe('Autocompleted address text'),
  highlight: z.string().optional().describe('Character ranges that matched the input'),
  description: z.string().optional().describe('Additional description')
});

export let autocompleteInternationalAddress = SlateTool.create(spec, {
  name: 'Autocomplete International Address',
  key: 'autocomplete_international_address',
  description: `Get address suggestions for a partial international address across 245+ countries. Returns matching address previews sorted by proximity to the user's location. Use preview IDs with the **Complete International Address Suggestion** tool to get the full address.`,
  instructions: [
    'Use countriesFilter to limit suggestions to country names or ISO 2-letter codes, separated by commas.',
    'If a result has a type other than "Address", use the containerId option to drill down into that result for more specific suggestions.'
  ],
  constraints: ['This is a preview endpoint and does not consume any lookups.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      partialStreet: z.string().describe('Partial address to autocomplete'),
      countriesFilter: z
        .string()
        .optional()
        .describe(
          'Country names or ISO 2-letter codes to filter suggestions, separated by commas'
        ),
      containerId: z
        .string()
        .optional()
        .describe('Container ID for drilldown into building-level results'),
      properCase: z.boolean().optional().describe('Return suggestions in proper case')
    })
  )
  .output(
    z.object({
      suggestions: z.array(intlPreviewSchema).describe('International address suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let previews: IntlAutocompletePreview[];
    if (ctx.input.containerId) {
      previews = await client.getIntlAutocompleteDrilldown(ctx.input.containerId, {
        countriesFilter: ctx.input.countriesFilter,
        properCase: ctx.input.properCase
      });
    } else {
      previews = await client.getIntlAutocompletePreviews(ctx.input.partialStreet, {
        countriesFilter: ctx.input.countriesFilter,
        properCase: ctx.input.properCase
      });
    }

    let suggestions = previews.map(p => ({
      previewId: p.id,
      type: p.type,
      text: p.text,
      highlight: p.highlight ?? undefined,
      description: p.description ?? undefined
    }));

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** international address suggestion(s) for "${ctx.input.partialStreet}"${ctx.input.countriesFilter ? ` in ${ctx.input.countriesFilter}` : ''}.`
    };
  })
  .build();
