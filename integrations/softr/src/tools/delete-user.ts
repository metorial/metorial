import { SlateTool } from 'slates';
import { z } from 'zod';
import { StudioClient } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Delete a user from a Softr application by their email address.

Requires the **domain** to be configured in the integration settings.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user to delete')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email of the deleted user'),
      deleted: z.boolean().describe('Whether the deletion was successful')
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

    await client.deleteUser(ctx.input.email);

    return {
      output: {
        email: ctx.input.email,
        deleted: true
      },
      message: `User **${ctx.input.email}** deleted successfully.`
    };
  })
  .build();
