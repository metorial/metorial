import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  nextPageUrl: z
    .string()
    .optional()
    .describe('Native continuation for account access discovery; keep the same limit.'),
  partialFailure: z.boolean().optional(),
  users: z
    .array(z.any())
    .optional()
    .describe(
      'Account access records (for list action); _id is distinct from sharedWithUser._id'
    ),
  userId: z.string().optional().describe('ID of the affected account access record'),
  deleted: z
    .boolean()
    .optional()
    .describe(
      'Whether account access was removed; the person and historical activity may remain'
    ),
  rawResult: z.any().optional().describe('Credential-filtered native API response')
});

export let manageUsers = SlateTool.create(spec, {
  name: 'Manage Users',
  key: 'manage_users',
  description: `List account access records, retrieve one exact access record, invite by email, replace access settings, or irreversibly remove account access. Native access-record IDs are not person identity IDs. The owner is absent from the list. Access updates require complete settings and production-environment permission; email, name, disabled and userType changes are refused. Invitations may send emails and have per-recipient partial failures.`
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum account access records per page for list.'),
      nextPageUrl: z
        .string()
        .optional()
        .describe('Exact continuation from the preceding list response; keep its limit.'),
      accessRecordId: z
        .string()
        .optional()
        .describe(
          'Native _id from the account access-record list; distinct from the person’s user identity. Legacy userId must resolve directly to the same access record.'
        ),
      replaceAll: z
        .boolean()
        .optional()
        .describe(
          'Required true for full-replace updates. Provide the complete writable configuration; omitted settings may be cleared.'
        ),
      action: z
        .enum(['list', 'get', 'invite', 'update', 'delete'])
        .describe('The operation to perform'),
      userId: z
        .string()
        .optional()
        .describe(
          'Legacy alias for the native access-record ID from list; no person-ID lookup or conversion is performed. Prefer accessRecordId.'
        ),
      userData: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'User data (required for invite and update). For invite, include "email" or "emails" and documented accessLevel or integrationAccessLevel fields.'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('manage_users', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
