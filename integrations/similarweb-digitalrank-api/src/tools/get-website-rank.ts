import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, normalizeDomain } from '../lib/client';
import { spec } from '../spec';

export let getWebsiteRank = SlateTool.create(spec, {
  name: 'Get Website Rank',
  key: 'get_website_rank',
  description: `Retrieve ranking data for a website domain. Supports three ranking types:
- **Global Rank**: SimilarWeb's monthly worldwide rank for a domain.
- **Country Rank**: Monthly rank within a specific country (requires a 2-letter ISO country code).
- **Category Rank**: The domain's industry category and its worldwide rank within that category for the previous month.

For global and country ranks, omit both dates to retrieve the most recent 28-day ranking data.`,
  instructions: [
    'Provide the domain without "www." prefix (e.g., "google.com" not "www.google.com").',
    'Use "country" rank type with a valid 2-letter ISO country code (e.g., "us", "gb", "de").',
    'Date parameters use YYYY-MM format and only apply to global and country rank types.'
  ],
  constraints: [
    'Pricing depends on the subscription: global and country rank use 1 hit per request or 1 credit per result; category rank uses 1 hit per request or 2 credits per result.',
    'Country rank does not support a worldwide filter — a specific country code is required.',
    'Available countries and historical data depend on the subscription. Call get_capabilities to check access.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .describe(
          'Website domain to look up (e.g., "google.com"). Do not include "www." prefix.'
        ),
      rankType: z
        .enum(['global', 'country', 'category'])
        .describe('Type of ranking to retrieve.'),
      countryCode: z
        .string()
        .optional()
        .describe(
          '2-letter ISO country code (e.g., "us", "gb"). Required when rankType is "country".'
        ),
      startDate: z
        .string()
        .optional()
        .describe(
          'Start month in YYYY-MM format. Omit for last 28 days. Applies to global and country rank types only.'
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'End month in YYYY-MM format. Omit for last 28 days. Applies to global and country rank types only.'
        ),
      mainDomainOnly: z
        .boolean()
        .optional()
        .describe(
          'If true, returns values for the main domain only (excludes subdomains). Applies to global and country rank types only.'
        )
    })
  )
  .output(
    z.object({
      domain: z.string().describe('The domain that was looked up.'),
      rankType: z.string().describe('The type of ranking returned.'),
      globalRank: z
        .array(
          z.object({
            date: z.string().describe('Month of the ranking in YYYY-MM format.'),
            rank: z.number().describe('Global rank for this month.')
          })
        )
        .optional()
        .describe('Monthly global rank entries. Present when rankType is "global".'),
      countryRank: z
        .array(
          z.object({
            date: z.string().describe('Month of the ranking in YYYY-MM format.'),
            rank: z.number().describe('Country rank for this month.')
          })
        )
        .optional()
        .describe('Monthly country rank entries. Present when rankType is "country".'),
      category: z
        .string()
        .optional()
        .describe('The industry category of the domain. Present when rankType is "category".'),
      categoryRank: z
        .number()
        .optional()
        .describe(
          'The domain\'s rank within its category. Present when rankType is "category".'
        ),
      lastUpdated: z.string().optional().describe('Date when the data was last updated.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { rankType } = ctx.input;
    let domain = normalizeDomain(ctx.input.domain);

    if (rankType === 'global') {
      let result = await client.getGlobalRank({
        domain,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        mainDomainOnly: ctx.input.mainDomainOnly
      });

      let ranks = result.globalRank.map(entry => ({
        date: entry.date,
        rank: entry.globalRank
      }));

      let latestRank = ranks.length > 0 ? ranks[ranks.length - 1]!.rank : null;

      return {
        output: {
          domain,
          rankType: 'global',
          globalRank: ranks,
          lastUpdated: result.meta.lastUpdated
        },
        message:
          latestRank !== null
            ? `**${domain}** has a global rank of **#${latestRank}** (${ranks.length} month(s) of data returned).`
            : `No global rank data found for **${domain}**.`
      };
    }

    if (rankType === 'country') {
      if (!ctx.input.countryCode) {
        throw createApiServiceError('countryCode is required when rankType is "country".');
      }

      let result = await client.getCountryRank({
        domain,
        country: ctx.input.countryCode,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        mainDomainOnly: ctx.input.mainDomainOnly
      });

      let ranks = result.countryRank.map(entry => ({
        date: entry.date,
        rank: entry.countryRank
      }));

      let latestRank = ranks.length > 0 ? ranks[ranks.length - 1]!.rank : null;

      return {
        output: {
          domain,
          rankType: 'country',
          countryRank: ranks,
          lastUpdated: result.meta.lastUpdated
        },
        message:
          latestRank !== null
            ? `**${domain}** has a rank of **#${latestRank}** in **${ctx.input.countryCode.toUpperCase()}** (${ranks.length} month(s) of data returned).`
            : `No country rank data found for **${domain}** in **${ctx.input.countryCode.toUpperCase()}**.`
      };
    }

    let result = await client.getCategoryRank({ domain });

    return {
      output: {
        domain,
        rankType: 'category',
        category: result.category,
        categoryRank: result.rank
      },
      message: result.category
        ? `**${domain}** is in the **${result.category}** category, ranked **#${result.rank}** within that category.`
        : `No category rank data found for **${domain}**.`
    };
  })
  .build();
