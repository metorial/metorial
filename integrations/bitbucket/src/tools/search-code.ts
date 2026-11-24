import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bitbucketServiceError } from '../lib/errors';
import { spec } from '../spec';

type SearchFilter = { attribute: string; eq?: string; wildcard?: string };

let modifierAttributes: Record<string, string> = {
  repo: 'repository',
  lang: 'language',
  ext: 'extension',
  path: 'path'
};

let buildFilter = (attribute: string, value: string): SearchFilter =>
  (attribute === 'repository' || attribute === 'path') && /[*?]/.test(value)
    ? { attribute, wildcard: value }
    : { attribute, eq: value };

let parseQuery = (query: string) => {
  let filters: SearchFilter[] = [];
  let term = query
    .replace(
      /(^|\s)(repo|lang|ext|path):("[^"]*"|\S+)/gi,
      (_match, lead: string, key: string, value: string) => {
        let unquoted = value.replace(/^"(.*)"$/, '$1').trim();
        if (unquoted)
          filters.push(buildFilter(modifierAttributes[key.toLowerCase()]!, unquoted));
        return lead;
      }
    )
    .replace(/\s+/g, ' ')
    .trim();

  return { term, filters };
};

let encodePageToken = (requestId: string, cursor: string) =>
  btoa(JSON.stringify({ requestId, cursor }));

let decodePageToken = (token: string) => {
  try {
    let parsed = JSON.parse(atob(token.trim()));
    if (typeof parsed?.requestId === 'string' && typeof parsed?.cursor === 'string') {
      return parsed as { requestId: string; cursor: string };
    }
  } catch {}
  throw bitbucketServiceError(
    'Invalid pageToken. Pass the nextPageToken value from a previous code search result unchanged.'
  );
};

let parseRepositoryUrl = (url: unknown) => {
  if (typeof url !== 'string') return undefined;
  try {
    let segments = new URL(url).pathname.split('/').filter(Boolean);
    if (segments[0] === '2.0' && segments[1] === 'repositories') segments = segments.slice(2);
    if (segments.length < 2) return undefined;
    return {
      workspace: decodeURIComponent(segments[0]!),
      slug: decodeURIComponent(segments[1]!)
    };
  } catch {
    return undefined;
  }
};

let chunkLines = (chunk: any) => {
  let start = Number(chunk?.line_range?.start) || 1;
  let end = Number(chunk?.line_range?.end) || undefined;
  let lines = String(chunk?.source_code ?? '')
    .split(/\r?\n/)
    .map((text, index) => ({ line: start + index, text }));
  if (end) lines = lines.filter(entry => entry.line <= end);

  let matched = new Set<number>(
    Array.isArray(chunk?.matched_line_numbers) ? chunk.matched_line_numbers : []
  );
  return matched.size ? lines.filter(entry => matched.has(entry.line)) : lines;
};

export let searchCodeTool = SlateTool.create(spec, {
  name: 'Search Code',
  key: 'search_code',
  description: `Search for code across repositories in the workspace, optionally scoped to one repository. Searches the default branch of each repository and returns matching file paths and code snippets. The query may include repo:, lang:, ext: and path: modifiers to narrow results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Code search query. Use this field for new calls. Supports repo:<slug>, lang:<language>, ext:<extension> and path:<path> modifiers.'
        ),
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
      pageToken: z
        .string()
        .optional()
        .describe(
          'nextPageToken from a previous result to fetch the next page. Repeat the same query and repository.'
        ),
      page: z
        .number()
        .optional()
        .describe('Legacy page number. Only 1 is accepted; use pageToken for later pages.'),
      pageLen: z.number().optional().describe('Results per page, 1 to 100 (default 50)')
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
      totalCount: z
        .number()
        .optional()
        .describe('Approximate total number of matches, returned on the first page only'),
      hasNextPage: z.boolean(),
      nextPageToken: z
        .string()
        .optional()
        .describe('Pass as pageToken with the same query to fetch the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });
    let query = ctx.input.query?.trim() || ctx.input.searchQuery?.trim();
    let repository = ctx.input.repository?.trim() || undefined;
    let pageToken = ctx.input.pageToken?.trim() || undefined;
    let pageLen = ctx.input.pageLen;

    if (!query) {
      throw bitbucketServiceError('Provide a code search query.');
    }

    if (repository && /\brepo\s*:/i.test(query)) {
      throw bitbucketServiceError(
        'Provide repository either with the repository field or a repo: modifier in query, not both.'
      );
    }

    if (ctx.input.page !== undefined && ctx.input.page > 1 && !pageToken) {
      throw bitbucketServiceError(
        'Bitbucket code search does not support page numbers. Pass nextPageToken from the previous result as pageToken.'
      );
    }

    if (
      pageLen !== undefined &&
      (!Number.isInteger(pageLen) || pageLen < 1 || pageLen > 100)
    ) {
      throw bitbucketServiceError('pageLen must be a whole number from 1 to 100.');
    }

    let { term, filters } = parseQuery(query);
    if (!term) {
      throw bitbucketServiceError('Provide search text in addition to query modifiers.');
    }
    if (repository) filters.unshift(buildFilter('repository', repository));

    let page = pageToken ? decodePageToken(pageToken) : undefined;

    let result = await client.searchCode({
      query: {
        search_term: term,
        ...(filters.length
          ? { filters: filters.length === 1 ? filters[0] : { and: filters } }
          : {})
      },
      ...(pageLen !== undefined ? { config: { max_results: pageLen } } : {}),
      ...(page ? { request_id: page.requestId, pagination: { next_cursor: page.cursor } } : {})
    });

    let repositories: any[] = Array.isArray(result?.repositories) ? result.repositories : [];
    let files: any[] = Array.isArray(result?.matched_files) ? result.matched_files : [];

    let results = files.map(file => {
      let repo =
        parseRepositoryUrl(file?.url) ??
        parseRepositoryUrl(
          repositories.find(r => typeof r?.url === 'string' && file?.url?.startsWith?.(r.url))
            ?.url
        ) ??
        (repositories.length === 1 ? parseRepositoryUrl(repositories[0]?.url) : undefined);

      return {
        repoSlug: repo?.slug,
        repoFullName: repo ? `${repo.workspace}/${repo.slug}` : undefined,
        filePath: typeof file?.path === 'string' ? file.path : undefined,
        matchingLines: (Array.isArray(file?.matched_chunks)
          ? file.matched_chunks
          : []
        ).flatMap(chunkLines)
      };
    });

    let nextCursor = result?.pagination?.next_cursor;
    let nextPageToken =
      result?.pagination?.has_more &&
      typeof nextCursor === 'string' &&
      typeof result?.id === 'string'
        ? encodePageToken(result.id, nextCursor)
        : undefined;
    let totalCount = result?.metadata?.total_count;

    return {
      output: {
        results,
        totalCount: !page && typeof totalCount === 'number' ? totalCount : undefined,
        hasNextPage: nextPageToken !== undefined,
        nextPageToken
      },
      message: `Found **${results.length}** code search results for "${query}"${repository ? ` in **${repository}**` : ''}.`
    };
  })
  .build();
