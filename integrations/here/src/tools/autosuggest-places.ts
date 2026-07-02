import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

let suggestionSchema = z.object({
  title: z.string().optional().describe('Suggested place name or address'),
  hereId: z.string().optional().describe('HERE place ID (if applicable)'),
  resultType: z
    .string()
    .optional()
    .describe('Result type (e.g. place, street, locality, chainQuery, categoryQuery)'),
  address: z
    .object({
      label: z.string().optional(),
      countryCode: z.string().optional(),
      countryName: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
      street: z.string().optional(),
      postalCode: z.string().optional(),
      houseNumber: z.string().optional()
    })
    .optional()
    .describe('Address of the suggestion'),
  position: z
    .object({
      lat: z.number(),
      lng: z.number()
    })
    .optional()
    .describe('Coordinates'),
  distance: z.number().optional().describe('Distance from search center in meters'),
  categories: z
    .array(
      z.object({
        categoryId: z.string().optional(),
        name: z.string().optional()
      })
    )
    .optional()
    .describe('Place categories'),
  highlights: z.any().optional().describe('Highlight information for displaying matching text')
});

export let autosuggestPlaces = SlateTool.create(spec, {
  name: 'Autosuggest Places',
  key: 'autosuggest_places',
  description: `Get real-time place and address suggestions as the user types. Returns a mix of places, addresses, and query completions optimized for search-as-you-type UIs.
Supports both the autosuggest endpoint (places + query suggestions) and the autocomplete endpoint (address completion only).`,
  instructions: [
    'Either "at" or "inArea" is required to scope the suggestions geographically.',
    'Set mode to "autocomplete" for address-only completions, or "autosuggest" (default) for places + query suggestions.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Partial search query typed by the user'),
      at: z.string().optional().describe('Search center as "lat,lng" for relevance ranking'),
      inArea: z.string().optional().describe('Geographic filter (e.g. "countryCode:DEU")'),
      limit: z.number().optional().describe('Maximum number of suggestions (default 20)'),
      lang: z.string().optional().describe('BCP 47 language code (e.g. "en-US")'),
      mode: z
        .enum(['autosuggest', 'autocomplete'])
        .optional()
        .describe(
          'Suggestion mode: "autosuggest" for places+queries (default), "autocomplete" for addresses only'
        ),
      termsLimit: z
        .number()
        .optional()
        .describe('Max predictive text terms (0-10, autosuggest mode only)'),
      types: z
        .string()
        .optional()
        .describe('Limit types in autocomplete mode (e.g. "city,postalCode,area")')
    })
  )
  .output(
    z.object({
      suggestions: z.array(suggestionSchema).describe('Suggested places and addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let response: any;
    let mode = ctx.input.mode || 'autosuggest';

    if (mode === 'autocomplete') {
      response = await client.autocomplete({
        query: ctx.input.query,
        at: ctx.input.at,
        inArea: ctx.input.inArea,
        limit: ctx.input.limit,
        lang: ctx.input.lang,
        types: ctx.input.types
      });
    } else {
      response = await client.autosuggest({
        query: ctx.input.query,
        at: ctx.input.at,
        inArea: ctx.input.inArea,
        limit: ctx.input.limit,
        lang: ctx.input.lang,
        termsLimit: ctx.input.termsLimit
      });
    }

    let items = response.items || [];
    let suggestions = items.map((item: any) => ({
      title: item.title,
      hereId: item.id,
      resultType: item.resultType,
      address: item.address,
      position: item.position,
      distance: item.distance,
      categories: item.categories?.map((c: any) => ({ categoryId: c.id, name: c.name })),
      highlights: item.highlights
    }));

    return {
      output: { suggestions },
      message:
        suggestions.length > 0
          ? `Returned **${suggestions.length}** suggestion(s) for "${ctx.input.query}" using **${mode}** mode.`
          : `No suggestions found for "${ctx.input.query}".`
    };
  })
  .build();
