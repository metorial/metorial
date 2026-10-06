import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
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
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let manageTimeEntries = SlateTool.create(spec, {
  name: 'Manage Time Entries',
  key: 'manage_time_entries',
  description: `Create, update, or delete time entries in FreshBooks. Log time worked against clients and projects with duration, notes, and billable status. Select the account or business discovered by get_identity.`,
  instructions: [
    'Duration is specified in seconds (e.g., 3600 = 1 hour).',
    'startedAt is a UTC Unix timestamp.',
    'Requires businessId to be set in the configuration.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...scopeInput,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      timeEntryId: z
        .number()
        .optional()
        .describe('Time entry ID (required for update/delete)'),
      duration: z.number().optional().describe('Duration in seconds (e.g. 3600 for 1 hour)'),
      startedAt: z
        .string()
        .optional()
        .describe('UTC timestamp when work began (ISO 8601 or Unix timestamp)'),
      clientId: z.number().optional().describe('Client ID to bill'),
      projectId: z.number().optional().describe('Project ID to associate with'),
      note: z.string().optional().describe('Description of work performed'),
      billable: z
        .boolean()
        .optional()
        .describe('Whether this time is billable (default: true)'),
      isLogged: z
        .boolean()
        .optional()
        .describe(
          'Whether to stop the timer (true = stopped/logged, false = timer still running)'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('manage_time_entries', ctx, outputSchema))
  .build();
