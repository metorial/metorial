import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let googleSearch = SlateTool.create(spec, {
  name: 'Google Search',
  key: 'google_search',
  description: `Scrape Google Search results in JSON or HTML format. Supports all featured snippets including knowledge graphs, People Also Ask, and answer boxes. Use the **lite** option for faster, lower-cost results with fewer snippets.`,
  instructions: [
    'Set `page` to 10 for the 2nd page, 20 for the 3rd page, etc.',
    'Use the `lite` option for cost-efficient searches when full featured snippets are not needed.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The search query string'),
      country: z
        .string()
        .optional()
        .describe(
          'Country code in ISO 3166 Alpha-2 format (e.g., "us", "gb", "de"). Defaults to "us".'
        ),
      language: z
        .string()
        .optional()
        .describe('Language of the results (e.g., "en_us", "de"). Defaults to "en_us".'),
      numResults: z.number().optional().describe('Number of results per page'),
      page: z
        .number()
        .optional()
        .describe('Page offset (0 for first page, 10 for second, 20 for third, etc.)'),
      languageRestrict: z
        .string()
        .optional()
        .describe('Restrict results to a language, e.g., "lang_en"'),
      location: z
        .string()
        .optional()
        .describe('UULE-encoded location for geo-targeted results'),
      timeFilter: z
        .string()
        .optional()
        .describe('Time filter: "d" (day), "w" (week), "m" (month), "y" (year)'),
      noAutoCorrect: z
        .boolean()
        .optional()
        .describe('Set to true to disable auto-correction of misspelled queries'),
      advancedFilter: z
        .string()
        .optional()
        .describe('Advanced TBS filter parameter for search results'),
      safeSearch: z
        .enum(['active', 'off'])
        .optional()
        .describe('Safe search filter for adult content. Defaults to "off".'),
      googleDomain: z
        .string()
        .optional()
        .describe(
          'Google domain for local results (e.g., "google.co.in"). Defaults to "google.com".'
        ),
      returnHtml: z
        .boolean()
        .optional()
        .describe('Set to true to return raw HTML response instead of JSON'),
      lite: z
        .boolean()
        .optional()
        .describe(
          'Use the lite search endpoint for faster, cheaper results with fewer featured snippets'
        )
    })
  )
  .output(
    z.object({
      results: z.any().describe('Search results from Google')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.googleSearch({
      q: ctx.input.query,
      gl: ctx.input.country,
      hl: ctx.input.language,
      num: ctx.input.numResults,
      page: ctx.input.page,
      lr: ctx.input.languageRestrict,
      uule: ctx.input.location,
      duration: ctx.input.timeFilter,
      nfpr: ctx.input.noAutoCorrect ? 1 : undefined,
      tbs: ctx.input.advancedFilter,
      safe: ctx.input.safeSearch,
      domain: ctx.input.googleDomain,
      html: ctx.input.returnHtml,
      lite: ctx.input.lite
    });

    let variant = ctx.input.lite ? 'lite' : 'advanced';
    return {
      output: { results: data },
      message: `Performed ${variant} Google search for **"${ctx.input.query}"**${ctx.input.country ? ` in ${ctx.input.country}` : ''}.`
    };
  })
  .build();
