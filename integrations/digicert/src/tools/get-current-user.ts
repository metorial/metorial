import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the CertCentral user assigned to the API key, including account, division, and access roles.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('CertCentral user ID'),
      accountId: z.number().optional().describe('CertCentral account ID'),
      username: z.string().optional().describe('Sign-in username'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      status: z.string().optional().describe('User status'),
      type: z.string().optional().describe('User type'),
      containerId: z.number().optional().describe('Division ID'),
      containerName: z.string().optional().describe('Division name'),
      accessRoles: z
        .array(
          z.object({
            id: z.number(),
            name: z.string()
          })
        )
        .describe('Access roles assigned to the user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });
    let user = await client.getMyUser();
    return {
      output: {
        userId: user.id,
        accountId: user.account_id ?? undefined,
        username: user.username ?? undefined,
        firstName: user.first_name ?? undefined,
        lastName: user.last_name ?? undefined,
        email: user.email ?? undefined,
        status: user.status ?? undefined,
        type: user.type ?? undefined,
        containerId: user.container?.id ?? undefined,
        containerName: user.container?.name ?? undefined,
        accessRoles: (user.access_roles ?? []).map((role: { id: number; name: string }) => ({
          id: role.id,
          name: role.name
        }))
      },
      message: `Connected as **${user.username ?? user.email ?? user.id}**.`
    };
  })
  .build();
