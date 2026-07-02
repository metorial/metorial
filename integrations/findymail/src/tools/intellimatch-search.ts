import { SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let intellimatchSearch = SlateTool.create(spec, {
  name: 'IntelliMatch Lead Search',
  key: 'intellimatch_search',
  description: `AI-powered lead discovery using natural language queries. Describe your ideal companies or contacts in plain English (e.g. "SaaS companies in the US with 50-200 employees") and get targeted results. Optionally find contacts and their emails at the same time.`,
  instructions: [
    'Provide a natural language description of your target companies or contacts.',
    'Enable findContact and findEmail to also discover people and their emails in matching companies.'
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
          'Natural language description of target companies/contacts, e.g. "SaaS companies in US with 50-200 employees".'
        ),
      limit: z.number().optional().describe('Maximum number of results to return.'),
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
        .describe('ID of the search, can be used to check status or retrieve results later.'),
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
    let client = new FindymailClient({ token: ctx.auth.token });

    let result = await client.intellimatchSearch({
      query: ctx.input.query,
      limit: ctx.input.limit,
      findContact: ctx.input.findContact,
      findEmail: ctx.input.findEmail
    });

    let data = result?.data ?? result?.results ?? [];
    let searchId = result?.search_id ?? result?.searchId ?? undefined;
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
