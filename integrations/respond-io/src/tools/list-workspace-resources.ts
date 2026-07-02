import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaceResources = SlateTool.create(spec, {
  name: 'List Workspace Resources',
  key: 'list_workspace_resources',
  description: `List workspace resources such as connected channels or workspace users (agents). Use this to discover channel IDs for messaging or user IDs for conversation assignment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['channels', 'users'])
        .describe('Type of workspace resource to list')
    })
  )
  .output(
    z.object({
      channels: z
        .array(
          z.object({
            channelId: z.string().describe('Channel ID'),
            channelName: z.string().optional().describe('Channel name'),
            channelType: z
              .string()
              .optional()
              .describe('Channel type (whatsapp, messenger, telegram, etc.)')
          })
        )
        .optional()
        .describe('Connected channels (when resourceType is "channels")'),
      users: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            userName: z.string().optional().describe('User display name'),
            userEmail: z.string().optional().describe('User email'),
            userRole: z.string().optional().describe('User role in the workspace')
          })
        )
        .optional()
        .describe('Workspace users (when resourceType is "users")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.resourceType === 'channels') {
      let result = await client.listChannels();
      let data = result?.data || result;
      let channelsList = Array.isArray(data) ? data : data?.channels || data?.data || [];

      let channels = channelsList.map((c: any) => ({
        channelId: String(c.id || ''),
        channelName: c.name,
        channelType: c.type || c.platform
      }));

      return {
        output: {
          channels
        },
        message: `Found **${channels.length}** connected channel(s).`
      };
    }

    let result = await client.listUsers();
    let data = result?.data || result;
    let usersList = Array.isArray(data) ? data : data?.users || data?.data || [];

    let users = usersList.map((u: any) => ({
      userId: String(u.id || ''),
      userName: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      userEmail: u.email,
      userRole: u.role
    }));

    return {
      output: {
        users
      },
      message: `Found **${users.length}** workspace user(s).`
    };
  })
  .build();
