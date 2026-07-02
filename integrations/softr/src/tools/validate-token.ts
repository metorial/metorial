import { SlateTool } from 'slates';
import { z } from 'zod';
import { StudioClient } from '../lib/client';
import { spec } from '../spec';

export let validateToken = SlateTool.create(spec, {
  name: 'Validate User Token',
  key: 'validate_user_token',
  description: `Validate a Softr user authentication JWT token. Useful when using Softr user data in external systems outside of Softr to verify the token is valid and extract user information.

Requires the **domain** to be configured in the integration settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jwt: z.string().describe('The JWT token to validate')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the token is valid'),
      user: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('User data extracted from the token, if valid')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.domain) {
      throw new Error(
        'The "domain" config is required for user management. Set it to your Softr app domain (e.g., yourapp.softr.app).'
      );
    }

    let client = new StudioClient({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.validateToken(ctx.input.jwt);

    return {
      output: {
        valid: true,
        user: result
      },
      message: `Token validated successfully.`
    };
  })
  .build();
