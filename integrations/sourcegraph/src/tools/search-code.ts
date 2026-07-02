import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchCode = SlateTool.create(spec, {
  name: 'Search Code',
  key: 'search_code',
  description: `Search across all repositories, branches, and code hosts using Sourcegraph's code search.
Supports literal, regex, and structural search patterns. Can search code content, file paths, diffs, commit messages, and symbols.
Queries can be scoped using filters like \`repo:\`, \`lang:\`, \`file:\`, \`type:\`, and more.
Uses the Stream API for efficient retrieval of results.`,
  instructions: [
    'Use Sourcegraph query syntax for advanced searches: repo:myrepo lang:go file:main.go type:diff',
    'Add count:all to get exhaustive results (may be slower)',
    'Use patternType to control matching: literal, regexp, or structural'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Sourcegraph search query. Supports filters like repo:, lang:, file:, type:commit, type:diff, type:symbol, etc.'
        ),
      patternType: z
        .enum(['literal', 'regexp', 'structural', 'keyword'])
        .optional()
        .describe('Pattern type for matching. Defaults to keyword.'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results to return. Defaults to 50.')
    })
  )
  .output(
    z.object({
      matchCount: z.number().describe('Total number of matches found'),
      results: z
        .array(
          z.object({
            type: z.string().describe('Type of match: content, path, commit, repo, symbol'),
            repository: z.string().optional().describe('Repository name'),
            filePath: z.string().optional().describe('File path'),
            fileUrl: z.string().optional().describe('URL to the file on Sourcegraph'),
            lineMatches: z
              .array(
                z.object({
                  lineNumber: z.number().optional(),
                  preview: z.string()
                })
              )
              .optional()
              .describe('Matched lines with context'),
            commitMessage: z.string().optional().describe('Commit message for commit matches'),
            commitAuthor: z.string().optional().describe('Commit author for commit matches')
          })
        )
        .describe('Search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    let maxResults = ctx.input.maxResults || 50;
    let query = ctx.input.query;
    if (maxResults && !query.includes('count:')) {
      query = `${query} count:${maxResults}`;
    }

    let matches = await client.streamSearch(query, {
      patternType: ctx.input.patternType
    });

    let results = matches.slice(0, maxResults).map((match: any) => {
      let type = match.type || 'content';
      let result: any = { type };

      if (match.repository) {
        result.repository =
          typeof match.repository === 'string'
            ? match.repository
            : match.repository.name || match.repository;
      }

      if (match.path) {
        result.filePath = match.path;
        result.fileUrl = match.url;
      }

      if (match.lineMatches || match.chunkMatches) {
        let lineMatches = match.lineMatches || [];
        if (match.chunkMatches) {
          lineMatches = match.chunkMatches.map((chunk: any) => ({
            lineNumber: chunk.contentStart?.line,
            preview: chunk.content
          }));
        }
        result.lineMatches = lineMatches.map((lm: any) => ({
          lineNumber: lm.lineNumber,
          preview: lm.preview || lm.content || ''
        }));
      }

      if (match.message) {
        result.commitMessage = match.message;
      }
      if (match.authorName) {
        result.commitAuthor = match.authorName;
      }

      return result;
    });

    return {
      output: {
        matchCount: matches.length,
        results
      },
      message: `Found **${matches.length}** matches${results.length < matches.length ? ` (showing first ${results.length})` : ''}.`
    };
  })
  .build();
