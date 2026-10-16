import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  getAttributes,
  getCollection,
  keywordRank,
  nullableNumber,
  requireRecord,
  requireText
} from '../lib/response';
import { spec } from '../spec';

export let listKeywords = SlateTool.create(spec, {
  name: 'List Keywords',
  key: 'list_keywords',
  description: `Retrieve tracked keywords for a project with their current rankings, search volume, SERP features, and trend data. Supports pagination and date filtering. Use this to get an overview of all keywords in a project and their performance.`,
  instructions: [
    'Set perPage to 250 for faster bulk retrieval. The provider default is 20.',
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
            currentRank: z
              .number()
              .nullable()
              .describe(
                'Current numeric Google ranking position; null when unavailable or out of range. See rawResponse for the original state.'
              ),
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
      currentPage: z
        .number()
        .nullable()
        .describe('Current page number reported by the provider'),
      rawResponse: z
        .any()
        .describe('Original keyword response, including nonnumeric rank states')
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

    let keywords = getCollection(data, 'keywords');
    let mapped = keywords.map(keyword => {
      let resource = requireRecord(keyword, 'keyword');
      let kw = getAttributes(resource);
      let device = kw.se_type ?? kw.type;
      let tags =
        kw.tags == null
          ? null
          : getCollection(kw.tags, 'tags').map(tag => {
              if (typeof tag === 'string') return tag;
              let name = requireRecord(tag, 'keyword tag').name;
              requireText(name, 'Keyword tag name returned by Keyword.com');
              return name as string;
            });
      return {
        keywordId: resource.id == null ? null : String(resource.id),
        keyword: kw.kw ?? kw.keyword ?? null,
        currentRank: keywordRank(kw.grank ?? kw.rank),
        bestRank: nullableNumber(kw.best, 'best rank'),
        url: kw.url ?? null,
        rankingUrl: kw.rankingurl ?? null,
        searchVolume: nullableNumber(kw.ms ?? kw.search_volume, 'search volume'),
        cpc: nullableNumber(kw.cpc, 'cost per click'),
        competition: nullableNumber(kw.competition, 'competition'),
        device: device === 'sem' ? 'mobile' : device === 'se' ? 'desktop' : (device ?? null),
        region: kw.region ?? null,
        language: kw.language ?? null,
        tags,
        serpFeatures: kw.serp_features ?? null,
        inLocalPack: kw.in_local_pack ?? null,
        inFeatured: kw.in_featured ?? null,
        trends: kw.trends ?? null
      };
    });

    return {
      output: {
        keywords: mapped,
        totalCount: nullableNumber(
          data?.meta?.pagination?.total ?? data?.total ?? data?.keywords_count,
          'total keyword count'
        ),
        currentPage: nullableNumber(
          data?.meta?.pagination?.current_page ?? data?.current_page,
          'current page'
        ),
        rawResponse: data
      },
      message: `Retrieved **${mapped.length}** keyword(s) from project **${ctx.input.projectName}**.`
    };
  })
  .build();
