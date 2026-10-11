import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import {
  integer,
  invalid,
  optionalText,
  pagingOutput,
  type Row,
  text
} from '../lib/contracts';
import { spec } from '../spec';

const option = (item: Row) => ({
  id: text(item.id, 'Targeting option ID'),
  name: optionalText(item.name),
  category: optionalText(item.category),
  country: optionalText(item.country),
  region: optionalText(item.region),
  subscriberCount:
    typeof item.subscriber_count === 'number' ? item.subscriber_count : undefined,
  raw: item
});

export const listTargetingOptions = SlateTool.create(spec, {
  key: 'list_targeting_options',
  name: 'List Targeting Options',
  description:
    'Find targetable communities, interests or geolocations for ad-group targeting. Communities are searched by name or topic and paginated; interests and geolocations return one filtered list.',
  instructions: [
    'Use community names as targetSubreddits, interest IDs as targetInterests and geolocation IDs as targetGeolocations in manage_ad_group.',
    'For geolocations, narrow results with country, city or postalCode.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      optionType: z
        .enum(['communities', 'interests', 'geolocations'])
        .describe('Kind of targeting option to look up.'),
      query: z
        .string()
        .optional()
        .describe(
          'communities: name or topic search. interests: case-insensitive match on name or category.'
        ),
      country: z
        .string()
        .optional()
        .describe('geolocations: ISO 3166-1 alpha-2 country code, such as US.'),
      city: z.string().optional().describe('geolocations: city name substring.'),
      postalCode: z.string().optional().describe('geolocations: postal code substring.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('interests and geolocations: maximum options returned (default 200).'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('communities: maximum records in one page (up to 1000).'),
      nextUrl: z
        .string()
        .optional()
        .describe('communities: exact nextUrl from the previous page with the same query.')
    })
  )
  .output(
    z.object({
      options: z.array(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          category: z.string().optional(),
          country: z.string().optional(),
          region: z.string().optional(),
          subscriberCount: z.number().optional(),
          raw: z.unknown()
        })
      ),
      truncated: z
        .boolean()
        .optional()
        .describe('True when more interests or geolocations matched than limit.'),
      ...pagingOutput
    })
  )
  .handleInvocation(async ctx => {
    const client = new RedditAdsClient(ctx.auth);
    const input = ctx.input;
    if (input.optionType !== 'geolocations')
      for (const field of ['country', 'city', 'postalCode'] as const)
        if (input[field] !== undefined) invalid(`${field} applies only to geolocations.`);
    if (input.optionType === 'communities') {
      if (input.limit !== undefined)
        invalid('limit applies to interests and geolocations; use pageSize for communities.');
      const page = await client.communities({
        ...input,
        query: input.query === undefined ? undefined : text(input.query, 'query')
      });
      return {
        output: {
          options: page.items.map(option),
          nextUrl: page.nextUrl,
          hasMore: page.hasMore
        },
        message: `Retrieved ${page.items.length} communities in this page${page.hasMore ? '; more pages are available' : ''}.`
      };
    }
    if (input.pageSize !== undefined || input.nextUrl !== undefined)
      invalid('pageSize and nextUrl apply only to communities; use limit instead.');
    if (input.optionType === 'geolocations' && input.query !== undefined)
      invalid('Use country, city or postalCode to filter geolocations.');
    const limit = input.limit === undefined ? 200 : integer(input.limit, 'limit', 1);
    let items =
      input.optionType === 'interests'
        ? await client.taxonomy('/targeting/interests')
        : await client.taxonomy('/targeting/geolocations', {
            country: input.country === undefined ? undefined : text(input.country, 'country'),
            cities_search: input.city === undefined ? undefined : text(input.city, 'city'),
            postal_code:
              input.postalCode === undefined ? undefined : text(input.postalCode, 'postalCode')
          });
    if (input.optionType === 'interests' && input.query !== undefined) {
      const needle = text(input.query, 'query').toLowerCase();
      items = items.filter(item =>
        [item.name, item.category].some(
          value => typeof value === 'string' && value.toLowerCase().includes(needle)
        )
      );
    }
    return {
      output: {
        options: items.slice(0, limit).map(option),
        truncated: items.length > limit,
        hasMore: false
      },
      message: `Retrieved ${Math.min(items.length, limit)} of ${items.length} matching ${input.optionType}.`
    };
  })
  .build();
