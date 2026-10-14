import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the user and workspace associated with your GetProspect API key. Returns the current workspace role and authentication channel without spending credits.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Current user ID'),
      email: z.string().describe('Current user email'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      timezone: z.string().optional().describe('User timezone'),
      createdAt: z.string().optional().describe('Account creation time'),
      workspace: z
        .object({
          workspaceId: z.number().describe('Workspace ID'),
          name: z.string().describe('Workspace name'),
          role: z.string().describe('Current user role in the workspace')
        })
        .optional()
        .describe('Workspace the credential acts in, when assigned'),
      authChannel: z.string().optional().describe('Authentication channel'),
      apiKeyId: z.string().optional().describe('API key ID, without the secret key')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getCurrentUser();
    return {
      output: {
        userId: result.id,
        email: result.email,
        firstName: result.first_name ?? undefined,
        lastName: result.last_name ?? undefined,
        timezone: result.timezone ?? undefined,
        createdAt: result.created_at ?? undefined,
        workspace: result.workspace
          ? {
              workspaceId: result.workspace.id,
              name: result.workspace.name,
              role: result.workspace.role
            }
          : undefined,
        authChannel: result.auth?.channel,
        apiKeyId: result.auth?.api_key_id ?? undefined
      },
      message: `Connected as **${result.email}**${result.workspace ? ` in **${result.workspace.name}**` : ''}.`
    };
  })
  .build();
