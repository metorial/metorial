import { setTimeout as delay } from 'node:timers/promises';
import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  linkedinSeedsFromCsv,
  readSearchResponse,
  type SearchMode,
  searchRecord,
  searchSummary
} from '../lib/search';
import { spec } from '../spec';

const summarySchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  linkedin_url: z.string().optional(),
  website: z.string().optional(),
  headline: z.string().optional()
});
const pageSchema = z.object({
  search_id: z.string().nullish(),
  results: z.array(searchRecord).default([]),
  next_cursor: z.string().nullish(),
  has_more: z.boolean().default(false),
  page_count: z.number().nullish(),
  page_number: z.number().nullish(),
  total_results: z.number(),
  total_available: z.number().nullish(),
  total_available_lower_bound: z.number().nullish(),
  charge_credits: z.number().nullish(),
  cursor_expires_in_seconds: z.number().nullish(),
  company_filter_truncated: searchRecord.nullish(),
  unmet_constraints: z.array(z.string()).nullish()
});
const resultSchema = summarySchema.extend({
  record: searchRecord.describe('Complete record returned by Sixtyfour.'),
  similarity_score: z.number().optional(),
  rank: z.number().optional(),
  matched_signals: z.array(searchRecord).optional()
});
const pageOutput = pageSchema.omit({ results: true }).extend({
  results: z.array(resultSchema)
});
const formatPage = (response: unknown) => {
  const page = readSearchResponse(pageSchema, response);
  if (page.has_more && !page.next_cursor)
    throw createApiServiceError(
      'Sixtyfour returned more search results without a continuation cursor. Run the search again.'
    );
  return {
    ...page,
    results: page.results.map(record => ({
      ...searchSummary(record),
      record,
      similarity_score:
        typeof record.lookalike_score === 'number' ? record.lookalike_score * 100 : undefined,
      rank: typeof record.lookalike_rank === 'number' ? record.lookalike_rank : undefined,
      matched_signals: z.array(searchRecord).safeParse(record.lookalike_evidence).success
        ? z.array(searchRecord).parse(record.lookalike_evidence)
        : undefined
    }))
  };
};
const pageSize = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe('Maximum records per page, from 1 to 100; defaults to 10.');
const cursor = z
  .string()
  .min(1)
  .max(100_000)
  .describe(
    'The next_cursor returned by the preceding search page. Pass it unchanged before it expires.'
  );
const maxResults = z
  .number()
  .int()
  .min(1)
  .optional()
  .describe(
    'Maximum records across all pages, within your account limit; API default is 1,000.'
  );
const billableSearch = [
  'Search pages consume credits for each returned record. A short or empty page may still have more results; use has_more and next_cursor.'
];

const createFieldsTool = (mode: SearchMode) =>
  SlateTool.create(spec, {
    key: `sixtyfour_${mode}_get_searchable_fields`,
    name:
      mode === 'company' ? 'Get Company Searchable Fields' : 'Get People Searchable Fields',
    description: `Discover valid ${mode} search fields, operators, and limits before building a query.`,
    tags: { readOnly: true }
  })
    .input(z.object({}))
    .output(
      z.object({
        mode: z.enum(['company', 'people']),
        fields: z.array(searchRecord),
        simple_query_operators: z.array(z.string()).nullish(),
        nested_paths: z.array(z.string()),
        limits: searchRecord,
        price_per_result_credits: z.number().optional()
      })
    )
    .handleInvocation(async ctx => {
      const response = await new Client(ctx.auth).get('/search/filter-capabilities', { mode });
      const result = readSearchResponse(
        z.object({
          fields: z.array(searchRecord),
          simple_query_operators: z.array(z.string()).nullish(),
          nested_paths: z.array(z.string()),
          limits: searchRecord,
          price_per_result_credits: z.number().optional()
        }),
        response
      );
      return {
        output: { mode, ...result },
        message: `Retrieved ${result.fields.length} searchable fields.`
      };
    })
    .build();

const createFieldValuesTool = (mode: SearchMode) =>
  SlateTool.create(spec, {
    key: `sixtyfour_${mode}_explore_field_values`,
    name: mode === 'company' ? 'Explore Company Field Values' : 'Explore People Field Values',
    description: `Find common values for a ${mode} field to build a valid search query. Discover supported fields with sixtyfour_${mode}_get_searchable_fields.`,
    tags: { readOnly: true }
  })
    .input(
      z.object({
        field: z
          .string()
          .min(1)
          .describe(
            'Canonical field name with supports_top_values enabled in searchable fields.'
          ),
        top_k: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Number of common values to return, from 1 to 100; defaults to 25.'),
        query: searchRecord
          .optional()
          .describe(
            'Optional MongoDB-style scope filter. Sort and limit operators are not supported here.'
          )
      })
    )
    .output(
      z.object({
        field: z.string(),
        canonical_field: z.string(),
        total_scoped_documents: z.number(),
        values: z.array(searchRecord),
        value_type: z.string().optional()
      })
    )
    .handleInvocation(async ctx => {
      const response = await new Client(ctx.auth).post(
        '/search/filter-field-values',
        pickDefined({
          mode,
          field: ctx.input.field,
          top_k: ctx.input.top_k,
          simple_filters: ctx.input.query
        })
      );
      const result = readSearchResponse(
        z.object({
          field: z.string(),
          canonical_field: z.string(),
          total_scoped_documents: z.number(),
          values: z.array(searchRecord).default([]),
          value_type: z.string().optional()
        }),
        response
      );
      return {
        output: result,
        message: `Retrieved ${result.values.length} values for ${result.field}.`
      };
    })
    .build();

const createSearchTool = (mode: SearchMode) =>
  SlateTool.create(spec, {
    key: `sixtyfour_${mode}_search`,
    name: mode === 'company' ? 'Search Companies' : 'Search People',
    description: `Search ${mode === 'company' ? 'companies' : 'people'} using MongoDB-style filters. Returns a summary and the complete record for each match.`,
    instructions: [
      `Discover field names with sixtyfour_${mode}_get_searchable_fields and valid values with sixtyfour_${mode}_explore_field_values.`
    ],
    constraints: billableSearch,
    tags: { readOnly: true }
  })
    .input(
      z.object({
        query: searchRecord.describe(
          'MongoDB-style filter object using discovered fields, including supported logical and comparison operators.'
        ),
        page_size: pageSize,
        max_results: maxResults,
        count_only: z
          .boolean()
          .optional()
          .describe(
            'Count-only mode is not supported by the public REST API. Leave false or omit; true is rejected without performing a billable search.'
          )
      })
    )
    .output(pageOutput)
    .handleInvocation(async ctx => {
      if (!Object.keys(ctx.input.query).length)
        throw createApiServiceError(
          `Provide at least one filter in query. Discover fields with sixtyfour_${mode}_get_searchable_fields.`
        );
      if (ctx.input.count_only)
        throw createApiServiceError(
          'Count-only search is unavailable through the public Sixtyfour REST API. Omit count_only or set it to false to retrieve a billable page; total_available is returned when the provider knows the exact count.'
        );
      const response = await new Client(ctx.auth).post(
        '/search/query',
        pickDefined({
          mode,
          simple_filters: ctx.input.query,
          page_size: ctx.input.page_size,
          max_results: ctx.input.max_results,
          output_shape: 'raw'
        })
      );
      const output = formatPage(response);
      return {
        output,
        message: `Returned ${output.results.length} ${mode === 'company' ? 'companies' : 'people'}.${output.has_more ? ' More results are available.' : ''}`
      };
    })
    .build();

const createNextPageTool = (mode: SearchMode) =>
  SlateTool.create(spec, {
    key: `sixtyfour_${mode}_next_page`,
    name: mode === 'company' ? 'Get Next Company Search Page' : 'Get Next People Search Page',
    description: `Retrieve the next page of a ${mode} search using its next_cursor.`,
    constraints: billableSearch,
    tags: { readOnly: true }
  })
    .input(z.object({ cursor }))
    .output(pageOutput)
    .handleInvocation(async ctx => {
      const response = await new Client(ctx.auth).post('/search/query', {
        cursor: ctx.input.cursor
      });
      const output = formatPage(response);
      return {
        output,
        message: `Returned ${output.results.length} search results.${output.has_more ? ' More results are available.' : ''}`
      };
    })
    .build();

const lookalikeStatusSchema = z.object({
  task_id: z.string(),
  status: z.string(),
  search_id: z.string().nullish(),
  start_time: z.string().optional(),
  close_time: z.string().nullish(),
  current_phase: z.number().nullish(),
  progress_message: z.string().nullish(),
  total_results: z.number().nullish(),
  filters: searchRecord.nullish(),
  analysis: searchRecord.nullish(),
  seed_diagnostics: searchRecord.nullish(),
  warnings: z.array(z.string()).nullish(),
  error: z.string().nullish()
});

export const findSimilarStart = SlateTool.create(spec, {
  key: 'sixtyfour_find_similar_start',
  name: 'Start Similar People Search',
  description:
    'Find people similar to 1–1,000 seed LinkedIn profiles. Returns task_id and search_id for status and results.',
  constraints: [
    'Starts a billable search. If submission times out, check a known task_id before retrying; the search may already exist.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      linkedin_urls: z
        .array(z.url().max(500))
        .min(1)
        .max(1000)
        .optional()
        .describe(
          '1–1,000 LinkedIn profile URLs. Supply either this list or csv_text, not both.'
        ),
      csv_text: z
        .string()
        .min(1)
        .max(2 * 1024 * 1024)
        .optional()
        .describe(
          'CSV with a header and at most 1,000 rows containing LinkedIn profile URLs. Use a linkedin, linkedin url, linkedin profile, or profile url column; every row must have a URL.'
        ),
      guidance: z
        .string()
        .max(2000)
        .optional()
        .describe(
          'Hard requirements beyond traits inferred from the seed cohort, such as a country restriction.'
        ),
      analysis_sample_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe(
          'Maximum representative seed profiles analyzed, from 1 to 100; defaults to 100.'
        )
    })
  )
  .output(
    z.object({
      task_id: z.string(),
      search_id: z.string(),
      status: z.string(),
      seed_diagnostics: searchRecord
    })
  )
  .handleInvocation(async ctx => {
    if ((ctx.input.linkedin_urls !== undefined) === (ctx.input.csv_text !== undefined))
      throw createApiServiceError('Supply exactly one of linkedin_urls or csv_text.');
    const urls =
      ctx.input.csv_text !== undefined
        ? linkedinSeedsFromCsv(ctx.input.csv_text)
        : ctx.input.linkedin_urls;
    const response = await new Client(ctx.auth).post(
      '/search/lookalike',
      pickDefined({
        linkedin_urls: urls,
        guidance: ctx.input.guidance,
        analysis_sample_size: ctx.input.analysis_sample_size
      })
    );
    const output = readSearchResponse(
      z.object({
        task_id: z.string(),
        search_id: z.string(),
        status: z.string(),
        seed_diagnostics: searchRecord
      }),
      response
    );
    return {
      output,
      message: `Started similar people search. Check task ${output.task_id} with sixtyfour_find_similar_status.`
    };
  })
  .build();

export const findSimilarStatus = SlateTool.create(spec, {
  key: 'sixtyfour_find_similar_status',
  name: 'Get Similar People Search Status',
  description:
    'Check a similar people search task. When completed, use search_id with sixtyfour_find_similar_results.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      task_id: z.string().min(1).describe('task_id returned by sixtyfour_find_similar_start.'),
      wait_seconds: z
        .number()
        .min(0)
        .max(25)
        .optional()
        .describe(
          'Poll for completion for up to 25 seconds between requests. Individual HTTP requests may take longer; defaults to one status read.'
        )
    })
  )
  .output(lookalikeStatusSchema)
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth);
    const end = Date.now() + (ctx.input.wait_seconds ?? 0) * 1000;
    const read = async () =>
      readSearchResponse(
        lookalikeStatusSchema,
        await client.get(`/search/lookalike/${encodeURIComponent(ctx.input.task_id)}`)
      );
    let output = await read();
    while (
      ['pending', 'queued', 'running', 'processing'].includes(output.status) &&
      Date.now() < end
    ) {
      await delay(Math.min(2500, end - Date.now()));
      if (Date.now() >= end) break;
      output = await read();
    }
    return { output, message: `Similar people search status: ${output.status}.` };
  })
  .build();

export const findSimilarResults = SlateTool.create(spec, {
  key: 'sixtyfour_find_similar_results',
  name: 'Get Similar People Search Results',
  description:
    'Page the ranked matches of a completed similar people search. Similarity scores are 0–100, with rank and matched signals when returned by the provider.',
  constraints: billableSearch,
  tags: { readOnly: true }
})
  .input(
    z.object({
      search_id: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Completed search_id from sixtyfour_find_similar_status. Supply this for the first page, or cursor alone for later pages.'
        ),
      cursor: cursor.optional(),
      page_size: pageSize,
      max_results: maxResults
    })
  )
  .output(pageOutput)
  .handleInvocation(async ctx => {
    if (
      ctx.input.cursor !== undefined &&
      (ctx.input.search_id !== undefined ||
        ctx.input.page_size !== undefined ||
        ctx.input.max_results !== undefined)
    )
      throw createApiServiceError('For later pages, provide cursor alone.');
    if (!ctx.input.cursor && !ctx.input.search_id)
      throw createApiServiceError(
        'Provide search_id for the first page or cursor for the next page.'
      );
    const body = ctx.input.cursor
      ? { cursor: ctx.input.cursor }
      : pickDefined({
          search_id: ctx.input.search_id,
          page_size: ctx.input.page_size,
          max_results: ctx.input.max_results
        });
    const response = await new Client(ctx.auth).post('/search/query', body);
    const output = formatPage(response);
    return {
      output,
      message: `Returned ${output.results.length} similar people.${output.has_more ? ' More results are available.' : ''}`
    };
  })
  .build();

export const searchTools = [
  createFieldsTool('company'),
  createFieldValuesTool('company'),
  createSearchTool('company'),
  createNextPageTool('company'),
  createFieldsTool('people'),
  createFieldValuesTool('people'),
  createSearchTool('people'),
  createNextPageTool('people'),
  findSimilarStart,
  findSimilarStatus,
  findSimilarResults
];
