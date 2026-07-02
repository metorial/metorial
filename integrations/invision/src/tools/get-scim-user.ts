import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScimClient } from '../lib/client';
import { spec } from '../spec';

export let getScimUser = SlateTool.create(spec, {
  name: 'Get SCIM User',
  key: 'get_scim_user',
  description: `Retrieves a single provisioned user by their SCIM ID from an InVision Enterprise account.
Returns the user's profile information including name, email, and active status.

**Note:** InVision was shut down on December 31, 2024. This tool will only work if the service is still accessible.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scimBaseUrl: z
        .string()
        .describe('The SCIM API base URL (e.g., https://team.invisionapp.com/scim/v2)'),
      userId: z.string().describe('The SCIM user ID to retrieve')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('SCIM user ID'),
      userName: z.string().describe('Username (typically email)'),
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

    let r = await client.getUser(ctx.input.userId);

    return {
      output: {
        userId: r.id,
        userName: r.userName,
        givenName: r.name?.givenName,
        familyName: r.name?.familyName,
        email: r.emails?.find((e: any) => e.type === 'work')?.value || r.emails?.[0]?.value,
        active: r.active
      },
      message: `Retrieved user **${r.userName}** (${r.active ? 'active' : 'inactive'}).`
    };
  })
  .build();
