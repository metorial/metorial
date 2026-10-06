import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    timeEntries: z.array(
      z.object({
        timeEntryId: z.number(),
        duration: z.number().nullable().optional(),
        startedAt: z.string().nullable().optional(),
        clientId: z.number().nullable().optional(),
        projectId: z.number().nullable().optional(),
        note: z.string().nullable().optional(),
        billable: z.boolean().nullable().optional(),
        billed: z.boolean().nullable().optional(),
        isLogged: z.boolean().nullable().optional()
      })
    ),
    totalCount: z.number(),
    currentPage: z.number(),
    totalPages: z.number()
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let listTimeEntries = SlateTool.create(spec, {
  name: 'List Time Entries',
  key: 'list_time_entries',
  description: `Search and list time entries in FreshBooks. Supports filtering by date range, project, client, and billing status. Select the account or business discovered by get_identity.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...scopeInput,
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page'),
      projectId: z.number().optional().describe('Filter by project ID'),
      clientId: z.number().optional().describe('Filter by client ID'),
      billable: z.boolean().optional().describe('Filter by billable status'),
      billed: z.boolean().optional().describe('Filter by billed status'),
      startedFrom: z
        .string()
        .optional()
        .describe('Filter entries started after this date (YYYY-MM-DD)'),
      startedTo: z
        .string()
        .optional()
        .describe('Filter entries started before this date (YYYY-MM-DD)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('list_time_entries', ctx, outputSchema))
  .build();
