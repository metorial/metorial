import { SlateTool } from 'slates';
import { StudioClient } from '../lib/client';
import { appConnection, fail, record, text, z } from '../lib/validation';
import { spec } from '../spec';
export const validateToken = SlateTool.create(spec, {
  name: 'Validate User Token',
  key: 'validate_user_token',
  description:
    'Validate a supplied user JWT against the exact published app hostname selected in the connection. The personal access token is not forwarded to this endpoint. Only an explicit native boolean validation result is accepted; HTTP success alone is not valid:true. This is not connection identity discovery and does not decode or invent user claims.',
  tags: { readOnly: true }
})
  .input(z.object({ jwt: z.string() }))
  .output(
    z.object({
      valid: z.boolean(),
      user: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Only explicit user data in a native valid:true receipt; never locally decoded claims.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const jwt = text(ctx.input.jwt, 'user JWT');
    if (jwt !== jwt.trim() || /\s/.test(jwt))
      fail('Provide the exact JWT without whitespace.');
    const r = await new StudioClient(appConnection(ctx.auth, ctx.config)).validateToken(jwt);
    if (typeof r === 'boolean')
      return {
        output: { valid: r },
        message: r
          ? 'The app explicitly confirmed this token as valid.'
          : 'The app explicitly reported this token as invalid.'
      };
    if (record(r) && typeof r.valid === 'boolean') {
      if (r.user !== undefined && (!r.valid || !record(r.user)))
        fail(
          'The token-validation receipt contains contradictory user data.',
          'invalid_response'
        );
      return {
        output: { valid: r.valid, user: r.valid && record(r.user) ? r.user : undefined },
        message: r.valid
          ? 'The app explicitly confirmed token validity.'
          : 'The app explicitly reported invalid token state.'
      };
    }
    fail(
      'The app returned no explicit native validation result. Do not treat HTTP success as valid; verify the token in Softr.',
      'invalid_response'
    );
  })
  .build();
