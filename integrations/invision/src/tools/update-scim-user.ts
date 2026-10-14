import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScimClient } from '../lib/client';
import { formatScimUser, scimUserSchema } from '../lib/scim-user';
import { spec } from '../spec';

export let updateScimUser = SlateTool.create(spec, {
  name: 'Update SCIM User',
  key: 'update_scim_user',
  description: `Updates an existing provisioned user's attributes in an InVision Enterprise account via the SCIM API.
Can update username, name, email, and active status. Only provided fields will be changed.

**Note:** InVision discontinued its design products on December 31, 2024. Legacy API availability is not guaranteed.`,
  tags: {
    destructive: false
  }
})
  .authMethods(['scim_bearer_token'])
  .input(
    z.object({
      scimBaseUrl: z
        .string()
        .describe('The SCIM API base URL (e.g., https://team.invisionapp.com/scim/v2)'),
      userId: z.string().min(1).describe('The SCIM user ID of the user to update'),
      userName: z.string().optional().describe('Updated username'),
      givenName: z.string().optional().describe('Updated first name'),
      familyName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated work email address'),
      active: z.boolean().optional().describe('Set to false to deactivate, true to reactivate')
    })
  )
  .output(scimUserSchema)
  .handleInvocation(async ctx => {
    let client = new ScimClient({
      token: ctx.auth.token,
      scimBaseUrl: ctx.input.scimBaseUrl
    });

    let r = await client.updateUser(ctx.input.userId, {
      userName: ctx.input.userName,
      givenName: ctx.input.givenName,
      familyName: ctx.input.familyName,
      email: ctx.input.email,
      active: ctx.input.active
    });

    let user = formatScimUser(r);

    return {
      output: user,
      message: `Successfully updated user **${user.userName}**.`
    };
  })
  .build();
