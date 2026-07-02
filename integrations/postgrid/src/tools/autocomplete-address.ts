import { SlateTool } from 'slates';
import { z } from 'zod';
import { AddressVerificationClient } from '../lib/address-client';
import { spec } from '../spec';

export let autocompleteAddress = SlateTool.create(spec, {
  name: 'Autocomplete Address',
  key: 'autocomplete_address',
  description: `Get type-ahead address suggestions for US and Canadian addresses. Provide a partial street address and receive matching completions. No lookup is consumed for preview suggestions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      partialStreet: z
        .string()
        .describe('Partial street address to autocomplete (e.g., "182 Se")')
    })
  )
  .output(
    z.object({
      suggestions: z
        .array(
          z.object({
            address: z.string().describe('Suggested street address'),
            city: z.string().optional().nullable().describe('City'),
            postalCodePrefix: z
              .string()
              .optional()
              .nullable()
              .describe('First digits of the postal code')
          })
        )
        .describe('List of address suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AddressVerificationClient(ctx.auth.token);
    let result = await client.autocompleteAddress(ctx.input.partialStreet);

    let suggestions = (result.data || []).map((s: any) => ({
      address: s.address,
      city: s.city,
      postalCodePrefix: s.pc
    }));

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** address suggestions for "${ctx.input.partialStreet}".`
    };
  })
  .build();

export let autocompleteInternationalAddress = SlateTool.create(spec, {
  name: 'Autocomplete International Address',
  key: 'autocomplete_international_address',
  description: `Get type-ahead address suggestions for international addresses across 245+ countries. Provide a partial street address and optionally filter by country.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      partialStreet: z.string().describe('Partial street address to autocomplete'),
      countriesFilter: z
        .string()
        .optional()
        .describe('Comma-separated country codes to filter results (e.g., "GB,DE,FR")')
    })
  )
  .output(
    z.object({
      suggestions: z
        .array(
          z.object({
            suggestionId: z
              .string()
              .optional()
              .nullable()
              .describe('Suggestion ID for retrieving the full address'),
            text: z.string().optional().nullable().describe('Primary suggestion text'),
            description: z
              .string()
              .optional()
              .nullable()
              .describe('Additional description (e.g., city, region)')
          })
        )
        .describe('List of international address suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AddressVerificationClient(ctx.auth.token);
    let result = await client.autocompleteInternationalAddress(
      ctx.input.partialStreet,
      ctx.input.countriesFilter
    );

    let suggestions = (result.data || []).map((s: any) => ({
      suggestionId: s.id,
      text: s.text,
      description: s.description
    }));

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** international address suggestions for "${ctx.input.partialStreet}".`
    };
  })
  .build();
