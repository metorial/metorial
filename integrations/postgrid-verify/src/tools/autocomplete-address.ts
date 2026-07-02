import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let previewSchema = z.object({
  previewId: z.string().describe('Unique ID for selecting this suggestion'),
  type: z.string().describe('Type of result (Address or BuildingNumber)'),
  text: z.string().describe('Autocompleted address text'),
  highlight: z.string().optional().describe('Character ranges that matched the input'),
  description: z.string().optional().describe('Additional description'),
  address: z.string().optional().describe('Street address preview'),
  city: z.string().optional().describe('City preview'),
  postalCodePrefix: z.string().optional().describe('First 3 digits of the postal/ZIP code'),
  provinceOrState: z.string().optional().describe('Province or state')
});

export let autocompleteAddress = SlateTool.create(spec, {
  name: 'Autocomplete Address',
  key: 'autocomplete_address',
  description: `Get address suggestions for a partial US or Canadian street address. Returns a list of matching address previews that can be used for type-ahead functionality. Use the preview IDs with the **Complete Address Suggestion** tool to get the full verified address.`,
  instructions: [
    'Provide the partial street address the user has typed so far.',
    'If a result has type "BuildingNumber" (not "Address"), use the drilldown option with that ID to get unit-level suggestions.',
    'To get the full address from a suggestion, use the Complete Address Suggestion tool with the previewId.'
  ],
  constraints: ['This is a preview endpoint and does not consume any lookups.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      partialStreet: z.string().describe('Partial street address to autocomplete'),
      containerId: z
        .string()
        .optional()
        .describe(
          'Container ID for drilldown into building-level results (from a previous preview with type other than "Address")'
        ),
      properCase: z.boolean().optional().describe('Return suggestions in proper case')
    })
  )
  .output(
    z.object({
      suggestions: z
        .array(previewSchema)
        .describe('Address suggestions matching the partial input')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let previews: any;
    if (ctx.input.containerId) {
      previews = await client.getAutocompleteDrilldown(ctx.input.containerId, {
        properCase: ctx.input.properCase
      });
    } else {
      previews = await client.getAutocompletePreviews(ctx.input.partialStreet, {
        properCase: ctx.input.properCase
      });
    }

    let suggestions = previews.map((p: any) => ({
      previewId: p.id,
      type: p.type,
      text: p.text,
      highlight: p.highlight,
      description: p.description,
      address: p.preview?.address,
      city: p.preview?.city,
      postalCodePrefix: p.preview?.pc,
      provinceOrState: p.preview?.prov
    }));

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** address suggestion(s) for "${ctx.input.partialStreet}".`
    };
  })
  .build();
