import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScimClient } from '../lib/client';
import { formatScimUser, scimUserSchema } from '../lib/scim-user';
import { spec } from '../spec';

export let getScimUser = SlateTool.create(spec, {
  name: 'Get SCIM User',
  key: 'get_scim_user',
  description: `Retrieves a single provisioned user by their SCIM ID from an InVision Enterprise account.
Returns the user's profile information including name, email, and active status.

**Note:** InVision discontinued its design products on December 31, 2024. Legacy API availability is not guaranteed.`,
  tags: {
    readOnly: true
  }
})
  .authMethods(['scim_bearer_token'])
  .input(
    z.object({
      scimBaseUrl: z
        .string()
        .describe('The SCIM API base URL (e.g., https://team.invisionapp.com/scim/v2)'),
      userId: z.string().min(1).describe('The SCIM user ID to retrieve')
    })
  )
  .output(scimUserSchema)
  .handleInvocation(async ctx => {
    let client = new ScimClient({
      token: ctx.auth.token,
      scimBaseUrl: ctx.input.scimBaseUrl
    });

    let r = await client.getUser(ctx.input.userId);

    let user = formatScimUser(r);

    return {
      output: user,
      message: `Retrieved user **${user.userName}** (${user.active === undefined ? 'status unavailable' : user.active ? 'active' : 'inactive'}).`
    };
  })
  .build();
