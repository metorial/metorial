import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let reversePropertyTypeMap: Record<number, string> = {
  0: 'apartment',
  1: 'house',
  2: 'building',
  3: 'parking',
  4: 'office',
  5: 'land',
  6: 'shop'
};

let reverseTransactionTypeMap: Record<number, string> = {
  0: 'sale',
  1: 'rent'
};

export let listSavedSearches = SlateTool.create(spec, {
  name: 'List Saved Searches',
  key: 'list_saved_searches',
  description: `List all saved searches for the authenticated account. Optionally filter by notification status or search title.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      notificationEnabled: z.boolean().optional().describe('Filter by notification status'),
      title: z.string().optional().describe('Filter by search title (partial match)'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction for title'),
      page: z.number().optional().describe('Page number (starts at 1)')
    })
  )
  .output(
    z.object({
      totalItems: z.number().describe('Total number of saved searches'),
      searches: z
        .array(
          z.object({
            searchId: z.string().describe('UUID of the saved search'),
            title: z.string().describe('Name of the saved search'),
            propertyTypes: z.array(z.string()).describe('Property types being monitored'),
            transactionType: z.string().describe('Transaction type (sale or rent)'),
            budgetMin: z.number().nullable().describe('Minimum budget filter'),
            budgetMax: z.number().nullable().describe('Maximum budget filter'),
            notificationEnabled: z.boolean().describe('Whether notifications are active'),
            createdAt: z.string().optional().describe('When the search was created'),
            updatedAt: z.string().optional().describe('When the search was last updated')
          })
        )
        .describe('List of saved searches')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.notificationEnabled !== undefined)
      params.notificationEnabled = ctx.input.notificationEnabled;
    if (ctx.input.title) params.title = ctx.input.title;
    if (ctx.input.sortDirection) params['order[title]'] = ctx.input.sortDirection;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;

    let result = await client.listSearches(params);
    let searches = (result['hydra:member'] ?? []).map((s: any) => ({
      searchId: s.uuid ?? s['@id']?.split('/').pop() ?? '',
      title: s.title,
      propertyTypes: (s.propertyTypes ?? []).map(
        (t: number) => reversePropertyTypeMap[t] ?? String(t)
      ),
      transactionType:
        reverseTransactionTypeMap[s.transactionType] ?? String(s.transactionType),
      budgetMin: s.budgetMin ?? null,
      budgetMax: s.budgetMax ?? null,
      notificationEnabled: s.notificationEnabled ?? false,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    return {
      output: {
        totalItems: result['hydra:totalItems'],
        searches
      },
      message: `Found **${result['hydra:totalItems']}** saved searches. Returned **${searches.length}** results.`
    };
  })
  .build();
