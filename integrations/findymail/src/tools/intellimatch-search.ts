import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let intellimatchSearch = SlateTool.create(spec, {
  name: 'IntelliMatch Lead Search',
  key: 'intellimatch_search',
  description: `Start an asynchronous lead search using a natural language company query. Optionally discover contacts and emails. Returns an export hash for get_intellimatch_status and get_intellimatch_results.`,
  instructions: [
    'Provide a natural language description of your target companies or contacts.',
    'Enable findContact and findEmail to also discover people and their emails in matching companies.',
    'Call get_intellimatch_status with the returned hash, then get_intellimatch_results when status is success.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Natural language description of target companies/contacts, e.g. "SaaS companies in US with 50-200 employees".'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum companies to find, 1 to 5000. Defaults to 100.'),
      findContact: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also find contacts at matching companies.'),
      findEmail: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also find verified emails for contacts.')
    })
  )
  .output(
    z.object({
      searchId: z
        .string()
        .optional()
        .describe(
          'Export hash, retained as searchId for compatibility. Use with the IntelliMatch status and results tools.'
        ),
      hash: z
        .string()
        .optional()
        .describe(
          'Export hash to pass to get_intellimatch_status and get_intellimatch_results.'
        ),
      results: z
        .array(
          z.object({
            name: z.string().optional().describe('Company or contact name.'),
            domain: z.string().optional().describe('Company domain.'),
            contactEmail: z.string().optional().describe('Contact email if found.')
          })
        )
        .optional()
        .describe('Search results if available immediately.'),
      status: z
        .string()
        .optional()
        .describe('Status of the search (e.g. "completed", "processing").')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.limit !== undefined &&
      (!Number.isInteger(ctx.input.limit) || ctx.input.limit < 1 || ctx.input.limit > 5000)
    ) {
      throw createApiServiceError('limit must be an integer between 1 and 5000.');
    }
    let client = new FindymailClient({ token: ctx.auth.token });

    let result = await client.intellimatchSearch({
      query: ctx.input.query,
      limit: ctx.input.limit,
      findContact: ctx.input.findContact,
      findEmail: ctx.input.findEmail
    });

    let data = result?.data ?? result?.results ?? [];
    let searchId = result?.hash ?? result?.search_id ?? result?.searchId ?? undefined;
    let status = result?.status ?? undefined;

    let results = Array.isArray(data)
      ? data.map((item: any) => ({
          name: item?.name ?? undefined,
          domain: item?.domain ?? undefined,
          contactEmail: item?.contact_email ?? item?.email ?? undefined
        }))
      : undefined;

    return {
      output: {
        searchId,
        hash: searchId,
        results,
        status
      },
      message:
        results && results.length > 0
          ? `IntelliMatch returned **${results.length}** result(s) for "${ctx.input.query}".`
          : searchId
            ? `IntelliMatch search started (ID: ${searchId}). Status: ${status ?? 'processing'}.`
            : `IntelliMatch search initiated for "${ctx.input.query}".`
    };
  })
  .build();
