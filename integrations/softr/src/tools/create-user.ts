import { SlateTool } from 'slates';
import { StudioClient } from '../lib/client';
import {
  appConnection,
  email,
  fail,
  magicLink,
  record,
  studioAccepted,
  text,
  z
} from '../lib/validation';
import { spec } from '../spec';
export const createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description:
    'Request creation of an app user with full name and email. Softr generates a password when omitted. Optionally return the requested native magic sign-in link; it is sensitive and grants login, so share it only with the intended user. The app must be published. Native acceptance is not an independently confirmed user record; check Softr before retrying an uncertain creation.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      fullName: z.string(),
      email: z.string(),
      password: z.string().optional(),
      generateMagicLink: z.boolean().optional()
    })
  )
  .output(
    z.object({
      email: z.string(),
      magicLink: z.string().optional(),
      accepted: z.boolean(),
      confirmed: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const c = appConnection(ctx.auth, ctx.config),
      target = email(ctx.input.email);
    text(ctx.input.fullName, 'full name');
    if (ctx.input.password !== undefined) text(ctx.input.password, 'password');
    const receipt = await new StudioClient(c).createUser({ ...ctx.input, email: target });
    studioAccepted(receipt);
    if (
      record(receipt.data) &&
      receipt.data.email !== undefined &&
      receipt.data.email !== target
    )
      fail(
        'The creation acknowledgement names a different user. Reconcile in the selected app before retrying.',
        'identity_mismatch'
      );
    const link = ctx.input.generateMagicLink ? magicLink(receipt.data, c.domain) : undefined;
    return {
      output: { email: target, magicLink: link, accepted: true, confirmed: false },
      message: link
        ? 'Softr accepted user creation and returned the requested sensitive sign-in link. Confirm the user in Softr before retrying.'
        : 'Softr accepted user creation. Confirm the exact user in the published app before retrying.'
    };
  })
  .build();
