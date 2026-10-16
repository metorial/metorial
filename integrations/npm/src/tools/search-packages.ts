import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from '../lib/client';
import {
  array,
  number,
  optionalNumber,
  optionalStrings,
  optionalText,
  record,
  text
} from '../lib/response';
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
    if (
      ctx.input.size !== undefined &&
      (!Number.isInteger(ctx.input.size) || ctx.input.size < 0 || ctx.input.size > 250)
    )
      throw createApiServiceError('size must be an integer between 0 and 250.');
    if (
      ctx.input.from !== undefined &&
      (!Number.isInteger(ctx.input.from) || ctx.input.from < 0)
    )
      throw createApiServiceError('from must be a non-negative integer.');
    for (let weight of [ctx.input.quality, ctx.input.popularity, ctx.input.maintenance]) {
      if (weight !== undefined && (weight < 0 || weight > 1))
        throw createApiServiceError('Search weights must be between 0 and 1.');
    }
    let client = new NpmRegistryClient({ token: ctx.auth.token || undefined });

    let result = record(
      await client.searchPackages({
        text: ctx.input.query,
        size: ctx.input.size,
        from: ctx.input.from,
        quality: ctx.input.quality,
        popularity: ctx.input.popularity,
        maintenance: ctx.input.maintenance
      }),
      'package search'
    );

    let total = number(result.total, 'search total');
    let packages = array(result.objects, 'search objects').map(value => {
      let obj = record(value, 'search result');
      let pkg = record(obj.package, 'search package');
      let score = obj.score == null ? undefined : record(obj.score, 'package score');
      let detail = score?.detail == null ? undefined : record(score.detail, 'score details');
      let links = pkg.links == null ? undefined : record(pkg.links, 'package links');
      let author = pkg.author == null ? undefined : record(pkg.author, 'package author');
      let publisher =
        pkg.publisher == null ? undefined : record(pkg.publisher, 'package publisher');
      return {
        packageName: text(pkg.name, 'search package name'),
        scope: pkg.scope === 'unscoped' ? undefined : optionalText(pkg.scope, 'package scope'),
        version: text(pkg.version, 'search package version'),
        description: optionalText(pkg.description, 'package description'),
        keywords: optionalStrings(pkg.keywords, 'package keywords'),
        author: optionalText(author?.name ?? author?.username, 'package author'),
        publisher: optionalText(publisher?.username, 'package publisher'),
        date: optionalText(pkg.date, 'publication date'),
        links: links
          ? {
              npm: optionalText(links.npm, 'npm URL'),
              homepage: optionalText(links.homepage, 'homepage URL'),
              repository: optionalText(links.repository, 'repository URL')
            }
          : undefined,
        score: score
          ? {
              final: optionalNumber(score.final, 'final score'),
              quality: optionalNumber(detail?.quality, 'quality score'),
              popularity: optionalNumber(detail?.popularity, 'popularity score'),
              maintenance: optionalNumber(detail?.maintenance, 'maintenance score')
            }
          : undefined
      };
    });

    return {
      output: {
        total: total,
        packages
      },
      message: `Found **${total}** package(s) matching "${ctx.input.query}". Showing ${packages.length} result(s).`
    };
  })
  .build();
