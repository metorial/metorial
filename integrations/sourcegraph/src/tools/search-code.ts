import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const searchCode = SlateTool.create(spec, {
  name: 'Search Code',
  key: 'search_code',
  description:
    'Search code, paths, commits, diffs and symbols with native Sourcegraph query syntax. Returns a bounded selection plus native final match statistics and skipped-work information. Legacy literal/structural modes require a deployment supporting them.',
  instructions: [
    'The query is sent unchanged. Native count: filters control search work; maxResults controls display only.',
    'Line numbers are zero-based. A terminal search does not imply every repository was searched; inspect skipped, alerts and truncated.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Native query, including repo:, lang:, file:, type: and patternType: filters.'
        ),
      patternType: z
        .enum(['literal', 'regexp', 'structural', 'keyword'])
        .optional()
        .describe(
          'Native default mode; query patternType: filters take precedence. Defaults to keyword.'
        ),
      maxResults: z
        .number()
        .optional()
        .describe(
          'Maximum displayed result objects, 1 to 1000; default 50. Does not rewrite or append a count: filter.'
        )
    })
  )
  .output(
    z.object({
      matchCount: z
        .number()
        .describe(
          'Native final match count, which may exceed the number of returned result objects.'
        ),
      results: z.array(
        z.object({
          type: z.string(),
          repository: z.string().optional(),
          filePath: z.string().optional(),
          fileUrl: z.string().optional(),
          lineMatches: z
            .array(z.object({ lineNumber: z.number().optional(), preview: z.string() }))
            .optional(),
          commitMessage: z.string().optional(),
          commitAuthor: z.string().optional()
        })
      ),
      returnedCount: z.number().optional(),
      truncated: z.boolean().optional(),
      skipped: z
        .array(z.object({ reason: z.string(), title: z.string().optional() }))
        .optional(),
      alerts: z
        .array(z.object({ title: z.string(), description: z.string().optional() }))
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await Client.forContext(ctx).streamSearch(ctx.input.query, {
      patternType: ctx.input.patternType,
      maxMatchCount: ctx.input.maxResults
    });
    return {
      output: {
        matchCount: result.matchCount,
        returnedCount: result.returnedCount,
        truncated: result.truncated,
        skipped: result.skipped,
        alerts: result.alerts,
        results: result.matches.map(match => ({
          type: match.type,
          repository:
            typeof match.repository === 'string' ? match.repository : match.repository?.name,
          filePath: match.path,
          fileUrl: match.url,
          lineMatches:
            match.chunkMatches?.map(chunk => ({
              lineNumber: chunk.contentStart?.line,
              preview: chunk.content
            })) ??
            match.lineMatches?.map(line => ({
              lineNumber: line.lineNumber,
              preview: line.line ?? line.preview ?? line.content ?? ''
            })),
          commitMessage: match.message,
          commitAuthor: match.authorName
        }))
      },
      message: `Returned **${result.returnedCount}** result objects; native search counted **${result.matchCount}** matches. Inspect skipped work and limits before treating the result as exhaustive.`
    };
  })
  .build();
