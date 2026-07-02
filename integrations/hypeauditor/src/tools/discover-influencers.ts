import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let discoverInfluencers = SlateTool.create(spec, {
  name: 'Discover Influencers',
  key: 'discover_influencers',
  description: `Find influencers matching specific criteria using extensive filters including audience demographics, performance metrics, account attributes, content keywords, and niche-based AI search. Supports Instagram, YouTube, TikTok, Twitter/X, and Twitch.`,
  instructions: [
    'The socialNetwork field is required and determines which platform-specific filters are available.',
    'Use nicheSearch for natural-language AI-powered niche queries (e.g., "home decor", "fitness coach").',
    'Use similarTo to find influencers similar to a given username.',
    'Set sandbox to true for testing without consuming credits (filters are ignored in sandbox mode).'
  ],
  constraints: [
    'Returns 20 results per page, max 500 pages (10,000 total results).',
    'Each page request consumes 1 Discovery Call credit.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      socialNetwork: z
        .enum(['instagram', 'youtube', 'tiktok', 'twitter', 'twitch'])
        .describe('Social network to search on'),
      page: z.number().optional().describe('Page number (1-500). Default: 1'),
      sandbox: z
        .boolean()
        .optional()
        .describe(
          'Use sandbox mode for testing without consuming credits. Filters are ignored.'
        ),

      // Text search
      searchKeywords: z
        .array(z.string())
        .optional()
        .describe('Keywords to search across bio and content'),
      searchContent: z
        .array(z.string())
        .optional()
        .describe('Keywords to search in content only'),
      searchDescription: z
        .array(z.string())
        .optional()
        .describe('Keywords to search in bio/description only'),
      nicheSearch: z
        .string()
        .optional()
        .describe(
          'Natural-language niche descriptor for AI-powered search (e.g., "home decor", "fitness coach")'
        ),

      // Account filters
      accountGeo: z
        .object({
          country: z
            .array(z.string())
            .optional()
            .describe('ISO country codes (e.g., ["us", "gb"])'),
          city: z.array(z.number()).optional().describe('City IDs')
        })
        .optional()
        .describe('Account location filter'),
      accountGender: z
        .enum(['male', 'female'])
        .optional()
        .describe('Account holder gender (Instagram, TikTok)'),
      accountAge: z
        .object({
          from: z.number().optional(),
          to: z.number().optional()
        })
        .optional()
        .describe('Account holder age range (Instagram only)'),
      accountLanguages: z.array(z.string()).optional().describe('ISO 639-1 language codes'),
      accountType: z
        .enum(['human'])
        .optional()
        .describe('Account type filter (Instagram only)'),
      hasContacts: z.boolean().optional().describe('Filter for accounts with contact info'),
      isVerified: z
        .number()
        .optional()
        .describe('Filter for verified accounts (1 = verified)'),

      // Audience filters
      audienceGeo: z
        .object({
          countries: z
            .array(
              z.object({
                countryId: z.string().describe('ISO country code'),
                percentage: z.number().describe('Minimum percentage of audience')
              })
            )
            .optional(),
          cities: z
            .array(
              z.object({
                cityId: z.number().describe('City ID'),
                percentage: z.number().describe('Minimum percentage of audience')
              })
            )
            .optional()
        })
        .optional()
        .describe('Audience geography filter'),
      audienceGender: z
        .object({
          gender: z.enum(['male', 'female']),
          percentage: z.number().describe('Minimum percentage')
        })
        .optional()
        .describe('Audience gender distribution filter'),
      audienceAge: z
        .object({
          groups: z
            .array(z.string())
            .describe('Age groups: 13_17, 18_24, 25_34, 35_44, 45_54, 55_64, 65'),
          percentage: z.number().describe('Minimum percentage')
        })
        .optional()
        .describe('Audience age distribution filter'),

      // Metric filters
      subscribersCount: z
        .object({
          from: z.number().optional(),
          to: z.number().optional()
        })
        .optional()
        .describe('Follower/subscriber count range'),
      engagementRate: z
        .object({
          from: z.number().optional(),
          to: z.number().optional()
        })
        .optional()
        .describe('Engagement rate range'),
      qualityScore: z
        .object({
          from: z.number().optional(),
          to: z.number().optional()
        })
        .optional()
        .describe('Account/Channel Quality Score range (0-100)'),
      viewsAvg: z
        .object({
          from: z.number().optional(),
          to: z.number().optional()
        })
        .optional()
        .describe('Average views range (YouTube, TikTok)'),
      priceRange: z
        .object({
          from: z.number().optional(),
          to: z.number().optional()
        })
        .optional()
        .describe('Post price range estimate'),

      // Growth
      growth: z
        .object({
          period: z.enum(['7d', '30d', '90d', '180d', '365d']),
          from: z.number().optional(),
          to: z.number().optional()
        })
        .optional()
        .describe('Follower growth rate percentage filter by period'),

      // Content
      category: z
        .object({
          include: z.array(z.number()).optional().describe('Category IDs to include'),
          exclude: z.array(z.number()).optional().describe('Category IDs to exclude')
        })
        .optional()
        .describe('Content category filter (Instagram, TikTok)'),
      similarTo: z.string().optional().describe('Find influencers similar to this username'),

      // Sorting
      sort: z
        .object({
          field: z.string().describe('Field to sort by (e.g., subscribers_count, er)'),
          order: z.enum(['asc', 'desc']).default('desc')
        })
        .optional()
        .describe('Sort results')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.any())
        .describe('Array of influencer results with basic info, metrics, and features'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total pages available'),
      remainingQueries: z.number().optional().describe('Remaining discovery query credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    let input = ctx.input;

    let filters: Record<string, any> = {
      social_network: input.socialNetwork
    };

    if (input.searchKeywords) filters.search = input.searchKeywords;
    if (input.searchContent) filters.search_content = input.searchContent;
    if (input.searchDescription) filters.search_description = input.searchDescription;
    if (input.nicheSearch) filters.niche_search = input.nicheSearch;
    if (input.accountGeo) filters.account_geo = input.accountGeo;
    if (input.accountGender) filters.account_gender = input.accountGender;
    if (input.accountAge) filters.account_age = input.accountAge;
    if (input.accountLanguages) filters.account_languages = input.accountLanguages;
    if (input.accountType) filters.account_type = input.accountType;
    if (input.hasContacts !== undefined) filters.account_has_contacts = input.hasContacts;
    if (input.isVerified !== undefined) filters.verified = input.isVerified;

    if (input.audienceGeo) {
      let audienceGeoParam: Record<string, any> = {};
      if (input.audienceGeo.countries) {
        audienceGeoParam.countries = input.audienceGeo.countries.map(c => ({
          id: c.countryId,
          prc: c.percentage
        }));
      }
      if (input.audienceGeo.cities) {
        audienceGeoParam.cities = input.audienceGeo.cities.map(c => ({
          id: c.cityId,
          prc: c.percentage
        }));
      }
      filters.audience_geo = audienceGeoParam;
    }

    if (input.audienceGender) {
      filters.audience_gender = {
        gender: input.audienceGender.gender,
        prc: input.audienceGender.percentage
      };
    }

    if (input.audienceAge) {
      filters.audience_age = {
        groups: input.audienceAge.groups,
        prc: input.audienceAge.percentage
      };
    }

    if (input.subscribersCount) filters.subscribers_count = input.subscribersCount;
    if (input.engagementRate) filters.er = input.engagementRate;
    if (input.qualityScore) {
      if (input.socialNetwork === 'youtube') {
        filters.cqs = input.qualityScore;
      } else {
        filters.aqs = input.qualityScore;
      }
    }
    if (input.viewsAvg) filters.views_avg = input.viewsAvg;
    if (input.priceRange) filters['blogger_prices.post_price'] = input.priceRange;
    if (input.growth) filters.growth = input.growth;
    if (input.category) filters.category = input.category;
    if (input.similarTo) filters.similar = input.similarTo;
    if (input.sort) filters.sort = input.sort;

    let response = await client.discoverInfluencers(filters, input.page, input.sandbox);
    let result = response?.result;

    return {
      output: {
        results: result?.search_results ?? [],
        currentPage: result?.current_page,
        totalPages: result?.total_pages,
        remainingQueries: result?.queries_left
      },
      message: `Found **${result?.search_results?.length ?? 0}** influencers (page ${result?.current_page ?? 1} of ${result?.total_pages ?? '?'}).`
    };
  })
  .build();
