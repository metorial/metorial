import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let crunchbaseCompany = SlateTool.create(spec, {
  name: 'Crunchbase Company',
  key: 'crunchbase_company',
  description: `Retrieve comprehensive company information from Crunchbase including funding history, financial highlights, employee count, operating status, categories, social networks, and timeline. Supports lookup by company name, Crunchbase UUID, or domain reverse lookup.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Company name or Crunchbase UUID'),
      domain: z.string().optional().describe('Company domain for reverse lookup')
    })
  )
  .output(
    z.object({
      uuid: z.string().optional(),
      name: z.string().optional(),
      permalink: z.string().optional(),
      website: z.string().optional(),
      description: z.string().optional(),
      headline: z.string().optional(),
      founded: z.string().optional(),
      companyType: z.string().optional(),
      operatingStatus: z.string().optional(),
      employeeCount: z.any().optional(),
      categories: z.array(z.any()).optional(),
      location: z.array(z.any()).optional(),
      fundingTotal: z.any().optional(),
      numFundingRounds: z.number().optional(),
      socialNetworks: z.any().optional(),
      raw: z.any().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getCrunchbaseCompany({
      query: ctx.input.query,
      domain: ctx.input.domain
    });

    let fundingHeadline = result.funding_rounds_headline ?? {};

    return {
      output: {
        uuid: result.uuid,
        name: result.name,
        permalink: result.permalink,
        website: result.website,
        description: result.description,
        headline: result.headline,
        founded: result.founded,
        companyType: result.company_type,
        operatingStatus: result.operating_status,
        employeeCount: result.employee_count,
        categories: result.categories,
        location: result.location,
        fundingTotal: fundingHeadline.funding_total,
        numFundingRounds: fundingHeadline.num_funding_rounds,
        socialNetworks: result.social_networks,
        raw: result
      },
      message: `Retrieved Crunchbase data for **${result.name ?? ctx.input.query ?? ctx.input.domain}**${fundingHeadline.funding_total ? ` — total funding: $${fundingHeadline.funding_total.value_usd ?? fundingHeadline.funding_total.value}` : ''}.`
    };
  })
  .build();

export let crunchbaseFundingRounds = SlateTool.create(spec, {
  name: 'Crunchbase Funding Rounds',
  key: 'crunchbase_funding_rounds',
  description: `Browse and filter recent funding rounds from Crunchbase. Filter by days since announcement, investment type (seed, series A-J, angel, etc.), investor, or funded organization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      daysSinceAnnouncement: z
        .number()
        .optional()
        .describe('Number of days since announcement (1-360, default 1)'),
      investmentType: z
        .string()
        .optional()
        .describe(
          'Investment type filter (e.g., "seed", "series_a", "angel", "private_equity")'
        ),
      investorId: z.string().optional().describe('Crunchbase UUID of the investor'),
      organizationId: z
        .string()
        .optional()
        .describe('Crunchbase UUID of the funded organization')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional(),
      fundingRounds: z.array(z.any()).describe('List of funding rounds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getCrunchbaseFundingRounds({
      daysSinceAnnouncement: ctx.input.daysSinceAnnouncement,
      investmentType: ctx.input.investmentType,
      investorIdentifiers: ctx.input.investorId,
      fundedOrganizationIdentifier: ctx.input.organizationId
    });

    let rounds = result.funding_rounds ?? result;
    let totalCount = rounds.total ?? 0;
    let fundingRounds = rounds.results ?? [];

    return {
      output: {
        totalCount,
        fundingRounds
      },
      message: `Found **${totalCount} funding rounds** matching the specified filters.`
    };
  })
  .build();

export let crunchbaseSearch = SlateTool.create(spec, {
  name: 'Crunchbase Search',
  key: 'crunchbase_search',
  description: `Search Crunchbase for companies, people, and organizations. Returns matching entities with basic information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            name: z.string().optional(),
            type: z.string().optional(),
            uuid: z.string().optional(),
            permalink: z.string().optional(),
            description: z.string().optional(),
            logo: z.string().optional()
          })
        )
        .describe('Search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.searchCrunchbase({ query: ctx.input.query });

    let results = (Array.isArray(result) ? result : []).map((r: any) => ({
      name: r.name,
      type: r.type,
      uuid: r.uuid,
      permalink: r.permalink,
      description: r.description,
      logo: r.logo
    }));

    return {
      output: { results },
      message: `Crunchbase search for **"${ctx.input.query}"** returned **${results.length} results**.`
    };
  })
  .build();
