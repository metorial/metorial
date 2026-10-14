import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScimClient } from '../lib/client';
import { formatScimUser, scimUserSchema } from '../lib/scim-user';
import { spec } from '../spec';

export let provisionScimUser = SlateTool.create(spec, {
  name: 'Provision SCIM User',
  key: 'provision_scim_user',
  description: `Creates a new user in an InVision Enterprise account via SCIM provisioning.
This provisions a new member, granting them access to the InVision Enterprise team. Requires an Enterprise plan with SCIM enabled.

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
      userName: z
        .string()
        .describe('Username for the new user (typically their email address)'),
      givenName: z.string().describe('First name of the user'),
      familyName: z.string().describe('Last name of the user'),
      email: z.string().describe('Work email address of the user'),
      active: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether the user should be active upon creation')
    })
  )
  .output(scimUserSchema)
  .handleInvocation(async ctx => {
    let client = new ScimClient({
      token: ctx.auth.token,
      scimBaseUrl: ctx.input.scimBaseUrl
    });

    let r = await client.createUser({
      userName: ctx.input.userName,
      givenName: ctx.input.givenName,
      familyName: ctx.input.familyName,
      email: ctx.input.email,
      active: ctx.input.active
    });

    let user = formatScimUser(r);

    return {
      output: user,
      message: `Successfully provisioned user **${user.userName}** with SCIM ID \`${user.userId}\`.`
    };
  })
  .build();
