import { SlateTool } from 'slates';
import { StudioClient } from '../lib/client';
import { appConnection, email, fail, studioAccepted, z } from '../lib/validation';
import { spec } from '../spec';
export const syncUsers = SlateTool.create(spec, {
  name: 'Sync Users',
  key: 'sync_users',
  description:
    'Request a user sync for explicit emails, or all users when emails is omitted. This may update many users and invoke configured data-source effects. An empty array is refused instead of silently syncing everyone. Acceptance is not completion; no documented polling endpoint is available. Verify in Softr before retrying.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      emails: z
        .array(z.string())
        .optional()
        .describe(
          'Specific email addresses; omit to explicitly request all users. An empty array is invalid.'
        )
    })
  )
  .output(
    z.object({
      synced: z
        .boolean()
        .describe(
          'Whether the sync request was accepted, not whether synchronization completed.'
        ),
      scope: z.string(),
      accepted: z.boolean(),
      completed: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const emails = ctx.input.emails?.map(email);
    if (
      emails !== undefined &&
      (!emails.length ||
        emails.length > 1000 ||
        new Set(emails.map(v => v.toLowerCase())).size !== emails.length)
    )
      fail('Provide 1–1000 distinct emails, or omit emails to request all users.');
    studioAccepted(
      await new StudioClient(appConnection(ctx.auth, ctx.config)).syncUsers(emails)
    );
    const scope = emails ? `${emails.length} specific user(s)` : 'all users';
    return {
      output: { synced: true, scope, accepted: true, completed: false },
      message:
        'Softr accepted the synchronization request. Completion and retained downstream effects must be checked in Softr before retrying.'
    };
  })
  .build();
