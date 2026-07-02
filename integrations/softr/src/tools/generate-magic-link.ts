import { SlateTool } from 'slates';
import { z } from 'zod';
import { StudioClient } from '../lib/client';
import { spec } from '../spec';

export let generateMagicLink = SlateTool.create(spec, {
  name: 'Generate Magic Link',
  key: 'generate_magic_link',
  description: `Generate a magic link for a user in a Softr application, enabling passwordless authentication. The user must already exist in the app.

Requires the **domain** to be configured in the integration settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user to generate a magic link for')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email of the user'),
      magicLink: z.string().describe('Generated magic link URL')
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

    let result = await client.generateMagicLink(ctx.input.email);

    return {
      output: {
        email: ctx.input.email,
        magicLink: result?.magic_link ?? result?.magicLink ?? result?.data?.magic_link ?? ''
      },
      message: `Magic link generated for **${ctx.input.email}**.`
    };
  })
  .build();
