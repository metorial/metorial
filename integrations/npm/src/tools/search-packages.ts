import { SlateTool } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from '../lib/client';
import { spec } from '../spec';

export let searchPackages = SlateTool.create(spec, {
  name: 'Search Packages',
  key: 'search_packages',
  description: `Search the npm registry for packages by text query. Supports keyword parameters like \`author:\`, \`scope:\`, and \`keywords:\` within the query text. Results include package metadata along with quality, popularity, and maintenance scores.`,
  instructions: [
    'Use keyword prefixes in the text query for targeted searches, e.g. "author:sindresorhus" or "keywords:cli,tool".',
    'Adjust quality, popularity, and maintenance weights (0–1) to influence result ranking.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Search text. Supports keyword parameters like author:username, scope:scopename, keywords:keyword1,keyword2'
        ),
      size: z
        .number()
        .optional()
        .describe('Number of results to return (default 20, max 250)'),
      from: z.number().optional().describe('Offset for pagination (default 0)'),
      quality: z.number().optional().describe('Weight for quality score (0–1)'),
      popularity: z.number().optional().describe('Weight for popularity score (0–1)'),
      maintenance: z.number().optional().describe('Weight for maintenance score (0–1)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching packages'),
      packages: z
        .array(
          z.object({
            packageName: z.string().describe('Package name'),
            scope: z
              .string()
              .optional()
              .describe('Package scope (e.g. "angular" for @angular/core)'),
            version: z.string().describe('Latest version'),
            description: z.string().optional().describe('Package description'),
            keywords: z.array(z.string()).optional().describe('Package keywords'),
            author: z.string().optional().describe('Author name'),
            publisher: z.string().optional().describe('Publisher username'),
            date: z.string().optional().describe('Last publish date'),
            links: z
              .object({
                npm: z.string().optional(),
                homepage: z.string().optional(),
                repository: z.string().optional()
              })
              .optional()
              .describe('Relevant links'),
            score: z
              .object({
                final: z.number().optional(),
                quality: z.number().optional(),
                popularity: z.number().optional(),
                maintenance: z.number().optional()
              })
              .optional()
              .describe('Package scores')
          })
        )
        .describe('Search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NpmRegistryClient({ token: ctx.auth.token || undefined });

    let result = await client.searchPackages({
      text: ctx.input.query,
      size: ctx.input.size,
      from: ctx.input.from,
      quality: ctx.input.quality,
      popularity: ctx.input.popularity,
      maintenance: ctx.input.maintenance
    });

    let packages = (result.objects || []).map((obj: any) => {
      let pkg = obj.package || {};
      let score = obj.score || {};
      let detail = score.detail || {};

      return {
        packageName: pkg.name,
        scope: pkg.scope === 'unscoped' ? undefined : pkg.scope,
        version: pkg.version,
        description: pkg.description,
        keywords: pkg.keywords,
        author: pkg.author?.name || pkg.author?.username,
        publisher: pkg.publisher?.username,
        date: pkg.date,
        links: pkg.links
          ? {
              npm: pkg.links.npm,
              homepage: pkg.links.homepage,
              repository: pkg.links.repository
            }
          : undefined,
        score: {
          final: score.final,
          quality: detail.quality,
          popularity: detail.popularity,
          maintenance: detail.maintenance
        }
      };
    });

    return {
      output: {
        total: result.total || 0,
        packages
      },
      message: `Found **${result.total || 0}** package(s) matching "${ctx.input.query}". Showing ${packages.length} result(s).`
    };
  })
  .build();
