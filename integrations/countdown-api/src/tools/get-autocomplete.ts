import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient, requireArray } from '../lib/client';
import { spec } from '../spec';

export let getAutocomplete = SlateTool.create(spec, {
  name: 'Get Autocomplete Suggestions',
  key: 'get_autocomplete',
  description: `Get real-time autocomplete search suggestions from eBay. Useful for discovering exact product names, popular search variations, and trending search terms for a given query prefix.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ebayDomain: z
        .enum([
          'ebay.com',
          'ebay.co.uk',
          'ebay.com.au',
          'ebay.at',
          'ebay.be',
          'befr.ebay.be',
          'benl.ebay.be',
          'ebay.ca',
          'ebay.fr',
          'ebay.de',
          'ebay.com.hk',
          'ebay.ie',
          'ebay.it',
          'ebay.com.my',
          'ebay.nl',
          'ebay.ph',
          'ebay.pl',
          'ebay.com.sg',
          'ebay.es',
          'ebay.ch'
        ])
        .optional()
        .describe('eBay domain. Defaults to configured domain.'),
      searchTerm: z.string().describe('The search term to get autocomplete suggestions for.')
    })
  )
  .output(
    z.object({
      suggestions: z.array(z.any()).describe('Array of autocomplete suggestion objects.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CountdownClient({ token: ctx.auth.token });
    let ebayDomain = ctx.input.ebayDomain || ctx.config.ebayDomain;

    if (!ctx.input.searchTerm.trim()) throw createApiServiceError('Provide a searchTerm.');
    let result = await client.getAutocomplete({
      ebayDomain,
      searchTerm: ctx.input.searchTerm
    });

    let suggestions = requireArray(result.autocomplete_results, 'autocomplete_results');

    return {
      output: {
        suggestions
      },
      message: `Found **${suggestions.length}** autocomplete suggestions for "${ctx.input.searchTerm}" on **${ebayDomain}**.`
    };
  })
  .build();
