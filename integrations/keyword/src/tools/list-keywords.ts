import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listKeywords = SlateTool.create(spec, {
  name: 'List Keywords',
  key: 'list_keywords',
  description: `Retrieve tracked keywords for a project with their current rankings, search volume, SERP features, and trend data. Supports pagination and date filtering. Use this to get an overview of all keywords in a project and their performance.`,
  instructions: [
    'Set perPage to 250 for faster bulk retrieval. Default is 20.',
    'Use the date parameter (YYYY-MM-DD) to retrieve historical ranking data for a specific date.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the project to list keywords from'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Results per page (default 20, max 250)'),
      date: z
        .string()
        .optional()
        .describe('Specific date to retrieve rankings for (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      keywords: z
        .array(
          z.object({
            keywordId: z.string().nullable().describe('Unique keyword identifier'),
            keyword: z.string().nullable().describe('The tracked keyword text'),
            currentRank: z.number().nullable().describe('Current Google ranking position'),
            bestRank: z.number().nullable().describe('Best ever ranking position'),
            url: z.string().nullable().describe('Tracked domain/URL'),
            rankingUrl: z
              .string()
              .nullable()
              .describe('URL currently ranking for this keyword'),
            searchVolume: z.number().nullable().describe('Monthly search volume'),
            cpc: z.number().nullable().describe('Cost per click'),
            competition: z.number().nullable().describe('Competition score'),
            device: z.string().nullable().describe('Device type (desktop/mobile)'),
            region: z.string().nullable().describe('Search region'),
            language: z.string().nullable().describe('Search language'),
            tags: z.array(z.string()).nullable().describe('Tags assigned to this keyword'),
            serpFeatures: z
              .any()
              .nullable()
              .describe('SERP features triggered by this keyword'),
            inLocalPack: z
              .boolean()
              .nullable()
              .describe('Whether the keyword appears in local pack'),
            inFeatured: z
              .boolean()
              .nullable()
              .describe('Whether the keyword appears in featured snippet'),
            trends: z
              .any()
              .nullable()
              .describe('Ranking movement trends (day/week/month/life)')
          })
        )
        .describe('Tracked keywords with ranking data'),
      totalCount: z.number().nullable().describe('Total number of keywords in the project'),
      currentPage: z.number().nullable().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listKeywords({
      projectName: ctx.input.projectName,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      date: ctx.input.date
    });

    let keywords = Array.isArray(data?.keywords)
      ? data.keywords
      : Array.isArray(data)
        ? data
        : [];

    let mapped = keywords.map((kw: any) => ({
      keywordId: kw.id ? String(kw.id) : null,
      keyword: kw.kw ?? kw.keyword ?? null,
      currentRank: kw.grank ?? kw.rank ?? null,
      bestRank: kw.best ?? null,
      url: kw.url ?? null,
      rankingUrl: kw.rankingurl ?? null,
      searchVolume: kw.ms ?? kw.search_volume ?? null,
      cpc: kw.cpc ?? null,
      competition: kw.competition ?? null,
      device:
        kw.se_type === 'sem'
          ? 'mobile'
          : kw.se_type === 'se'
            ? 'desktop'
            : (kw.se_type ?? null),
      region: kw.region ?? null,
      language: kw.language ?? null,
      tags: kw.tags ?? null,
      serpFeatures: kw.serp_features ?? null,
      inLocalPack: kw.in_local_pack ?? null,
      inFeatured: kw.in_featured ?? null,
      trends: kw.trends ?? null
    }));

    return {
      output: {
        keywords: mapped,
        totalCount: data?.total ?? data?.keywords_count ?? mapped.length,
        currentPage: data?.current_page ?? ctx.input.page ?? 1
      },
      message: `Retrieved **${mapped.length}** keyword(s) from project **${ctx.input.projectName}**.`
    };
  })
  .build();
