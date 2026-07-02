import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let causeSchema = z.object({
  causeId: z.number().describe('Cause ID'),
  name: z.string().describe('Cause name'),
  color: z.string().describe('Hex color'),
  logo: z.string().describe('Logo URL')
});

let nonProfitSchema = z.object({
  ein: z.string().describe('Employer Identification Number'),
  name: z.string().describe('Organization name'),
  website: z.string().nullable().describe('Organization website'),
  city: z.string().nullable().describe('City'),
  state: z.string().nullable().describe('State'),
  publicUrl: z.string().describe('Daffy public profile URL'),
  logo: z.string().nullable().describe('Organization logo URL'),
  latitude: z.number().nullable().describe('Geographic latitude'),
  longitude: z.number().nullable().describe('Geographic longitude'),
  primaryCause: causeSchema.nullable().describe('Primary cause category'),
  causes: z.array(causeSchema).describe('All associated causes')
});

export let searchNonprofits = SlateTool.create(spec, {
  name: 'Search Nonprofits',
  key: 'search_nonprofits',
  description: `Search Daffy's database of 1.7M+ U.S. nonprofits by name/keyword and/or cause category. Use this to find charities, verify nonprofit details, or browse organizations by cause.`,
  instructions: [
    'Provide at least a query or causeId to search. Both can be combined for more specific results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search text to match against nonprofit names'),
      causeId: z.number().optional().describe('Filter by cause ID'),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination (defaults to first page)')
    })
  )
  .output(
    z.object({
      nonprofits: z.array(nonProfitSchema).describe('Matching nonprofits'),
      totalCount: z.number().describe('Total number of matching nonprofits'),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last available page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.searchNonProfits({
      query: ctx.input.query,
      causeId: ctx.input.causeId,
      page: ctx.input.page
    });

    return {
      output: {
        nonprofits: result.items.map(np => ({
          ein: np.ein,
          name: np.name,
          website: np.website,
          city: np.city,
          state: np.state,
          publicUrl: np.public_url,
          logo: np.logo,
          latitude: np.latitude,
          longitude: np.longitude,
          primaryCause: np.cause
            ? {
                causeId: np.cause.id,
                name: np.cause.name,
                color: np.cause.color,
                logo: np.cause.logo
              }
            : null,
          causes: (np.causes || []).map(c => ({
            causeId: c.id,
            name: c.name,
            color: c.color,
            logo: c.logo
          }))
        })),
        totalCount: result.meta.count,
        currentPage: result.meta.page,
        lastPage: result.meta.last
      },
      message: `Found **${result.meta.count}** nonprofit(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}. Showing page ${result.meta.page} of ${result.meta.last}.`
    };
  })
  .build();

export let getNonprofit = SlateTool.create(spec, {
  name: 'Get Nonprofit',
  key: 'get_nonprofit',
  description: `Look up a specific U.S. nonprofit by its EIN (Employer Identification Number) to get detailed information including name, website, location, logo, and associated causes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ein: z.string().describe('Employer Identification Number of the nonprofit')
    })
  )
  .output(nonProfitSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let np = await client.getNonProfit(ctx.input.ein);

    return {
      output: {
        ein: np.ein,
        name: np.name,
        website: np.website,
        city: np.city,
        state: np.state,
        publicUrl: np.public_url,
        logo: np.logo,
        latitude: np.latitude,
        longitude: np.longitude,
        primaryCause: np.cause
          ? {
              causeId: np.cause.id,
              name: np.cause.name,
              color: np.cause.color,
              logo: np.cause.logo
            }
          : null,
        causes: (np.causes || []).map(c => ({
          causeId: c.id,
          name: c.name,
          color: c.color,
          logo: c.logo
        }))
      },
      message: `**${np.name}** (EIN: ${np.ein}) — ${np.city || 'Unknown'}, ${np.state || 'Unknown'}. ${np.website ? `Website: ${np.website}` : 'No website listed.'}`
    };
  })
  .build();
