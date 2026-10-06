import { SlateTool } from 'slates';
import { StudioClient } from '../lib/client';
import { appConnection, email, studioAccepted, z } from '../lib/validation';
import { spec } from '../spec';
export const deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description:
    'Request deletion of an exact app user by email. The app must be published and selected in the connection. The documented API has no user readback, so acceptance does not confirm absence or erasure of retained data. Verify in Softr before retrying. Use manage_user_lifecycle to deactivate while retaining the record.',
  tags: { destructive: true, readOnly: false }
})
  .input(z.object({ email: z.string() }))
  .output(
    z.object({
      email: z.string(),
      deleted: z
        .boolean()
        .describe('False when native absence cannot be independently confirmed.'),
      accepted: z.boolean(),
      confirmed: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const target = email(ctx.input.email);
    studioAccepted(
      await new StudioClient(appConnection(ctx.auth, ctx.config)).deleteUser(target)
    );
    return {
      output: { email: target, deleted: false, accepted: true, confirmed: false },
      message:
        'Softr accepted the deletion request. Check the exact app user in Softr to confirm absence; retained data is not proven erased.'
    };
  })
  .build();
