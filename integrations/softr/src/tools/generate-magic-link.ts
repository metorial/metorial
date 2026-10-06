import { SlateTool } from 'slates';
import { StudioClient } from '../lib/client';
import { appConnection, email, magicLink, studioAccepted, z } from '../lib/validation';
import { spec } from '../spec';
export const generateMagicLink = SlateTool.create(spec, {
  name: 'Generate Magic Link',
  key: 'generate_magic_link',
  description:
    'Request a native magic sign-in link for an exact user in the selected published app. The link grants login and is sensitive; share it only with the intended user. No expiry or renewal is invented. Generating another link can have retained authentication effects, so reconcile an uncertain response before retrying.',
  tags: { readOnly: false }
})
  .input(z.object({ email: z.string() }))
  .output(z.object({ email: z.string(), magicLink: z.string() }))
  .handleInvocation(async ctx => {
    const c = appConnection(ctx.auth, ctx.config),
      target = email(ctx.input.email),
      r = await new StudioClient(c).generateMagicLink(target);
    studioAccepted(r);
    return {
      output: { email: target, magicLink: magicLink(r.data, c.domain) },
      message:
        'Returned the sensitive native sign-in link for the requested app user. Share it only with that user.'
    };
  })
  .build();
