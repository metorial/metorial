import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bitbucketServiceError } from '../lib/errors';
import { spec } from '../spec';

export let searchCodeTool = SlateTool.create(spec, {
  name: 'Search Code',
  key: 'search_code',
  description: `Search for code across repositories in the workspace, optionally scoped to one repository. Returns matching file paths and code snippets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Code search query. Use this field for new calls.'),
      searchQuery: z
        .string()
        .optional()
        .describe('Legacy alias for query, used only when query is omitted.'),
      repository: z
        .string()
        .optional()
        .describe(
          'Optional repository slug to limit the search to one repository. Do not also include a repo: modifier in query.'
        ),
      page: z.number().optional().describe('Page number'),
      pageLen: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          repoSlug: z.string().optional(),
          repoFullName: z.string().optional(),
          filePath: z.string().optional(),
          matchingLines: z
            .array(
              z.object({
                line: z.number().optional(),
                text: z.string().optional()
              })
            )
            .optional()
        })
      ),
      totalCount: z.number().optional(),
      hasNextPage: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });
    let query = ctx.input.query?.trim() || ctx.input.searchQuery?.trim();
    let repository = ctx.input.repository?.trim() || undefined;

    if (!query) {
      throw bitbucketServiceError('Provide a code search query.');
    }

    if (repository && /\brepo\s*:/i.test(query)) {
      throw bitbucketServiceError(
        'Provide repository either with the repository field or a repo: modifier in query, not both.'
      );
    }

    let result = await client.searchCode(query, {
      repository,
      page: ctx.input.page,
      pageLen: ctx.input.pageLen
    });

    let results = (result.values || []).map((r: any) => ({
      repoSlug:
        r.file?.links?.self?.href?.match(/repositories\/[^/]+\/([^/]+)/)?.[1] || undefined,
      repoFullName:
        r.file?.links?.self?.href?.match(/repositories\/([^/]+\/[^/]+)/)?.[1] || undefined,
      filePath: r.file?.path || undefined,
      matchingLines: (r.content_matches || []).flatMap((cm: any) =>
        (cm.lines || []).map((l: any) => ({
          line: l.line,
          text: l.segments?.map((s: any) => s.text).join('') || undefined
        }))
      )
    }));

    return {
      output: {
        results,
        totalCount: result.size,
        hasNextPage: !!result.next
      },
      message: `Found **${results.length}** code search results for "${query}"${repository ? ` in **${repository}**` : ''}.`
    };
  })
  .build();
