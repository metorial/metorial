import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScimClient } from '../lib/client';
import { spec } from '../spec';

export let provisionScimUser = SlateTool.create(spec, {
  name: 'Provision SCIM User',
  key: 'provision_scim_user',
  description: `Creates a new user in an InVision Enterprise account via SCIM provisioning.
This provisions a new member, granting them access to the InVision Enterprise team. Requires an Enterprise plan with SCIM enabled.

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
  .output(
    z.object({
      userId: z.string().describe('SCIM user ID of the newly created user'),
      userName: z.string().describe('Username of the created user'),
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

    let r = await client.createUser({
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
      message: `Successfully provisioned user **${r.userName}** with SCIM ID \`${r.id}\`.`
    };
  })
  .build();
