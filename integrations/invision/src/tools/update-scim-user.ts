import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScimClient } from '../lib/client';
import { spec } from '../spec';

export let updateScimUser = SlateTool.create(spec, {
  name: 'Update SCIM User',
  key: 'update_scim_user',
  description: `Updates an existing provisioned user's attributes in an InVision Enterprise account via the SCIM API.
Can update username, name, email, and active status. Only provided fields will be changed.

**Note:** InVision was shut down on December 31, 2024. This tool will only work if the service is still accessible.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      scimBaseUrl: z
        .string()
        .describe('The SCIM API base URL (e.g., https://team.invisionapp.com/scim/v2)'),
      userId: z.string().describe('The SCIM user ID of the user to update'),
      userName: z.string().optional().describe('Updated username'),
      givenName: z.string().optional().describe('Updated first name'),
      familyName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated work email address'),
      active: z.boolean().optional().describe('Set to false to deactivate, true to reactivate')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('SCIM user ID'),
      userName: z.string().describe('Username'),
      givenName: z.string().optional().describe('First name'),
      familyName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Work email address'),
      active: z.boolean().optional().describe('Whether the user account is active')
    })
  )
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

    return {
      output: {
        userId: r.id,
        userName: r.userName,
        givenName: r.name?.givenName,
        familyName: r.name?.familyName,
        email: r.emails?.find((e: any) => e.type === 'work')?.value || r.emails?.[0]?.value,
        active: r.active
      },
      message: `Successfully updated user **${r.userName}**.`
    };
  })
  .build();
