import { SlateTool } from 'slates';
import { StudioClient } from '../lib/client';
import { appConnection, email, studioAccepted, z } from '../lib/validation';
import { spec } from '../spec';
export const manageUserLifecycle = SlateTool.create(spec, {
  name: 'Manage User Lifecycle',
  key: 'manage_user_lifecycle',
  description:
    'Request activation or deactivation of an exact app user. Deactivation prevents login and frees the user seat while retaining the user record; activation reverses it. The documented API has no independent user readback, so acceptance does not prove the resulting state. Verify in the selected published app before retrying.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ email: z.string(), action: z.enum(['activate', 'deactivate']) }))
  .output(
    z.object({
      email: z.string(),
      action: z.enum(['activate', 'deactivate']),
      accepted: z.boolean(),
      confirmed: z.boolean(),
      recordRetained: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const target = email(ctx.input.email);
    studioAccepted(
      await new StudioClient(appConnection(ctx.auth, ctx.config)).lifecycle(
        target,
        ctx.input.action
      )
    );
    return {
      output: {
        email: target,
        action: ctx.input.action,
        accepted: true,
        confirmed: false,
        recordRetained: true
      },
      message:
        'Softr accepted the lifecycle request. Check the app to confirm login state; deactivation retains the user record.'
    };
  })
  .build();
