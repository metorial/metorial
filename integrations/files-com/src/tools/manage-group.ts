import { SlateTool } from 'slates';
import { z } from 'zod';
import { FilesComClient } from '../lib/client';
import { spec } from '../spec';

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Create, update, list, or delete groups. Groups organize users and can have protocol-level permissions (SFTP, FTP, WebDAV, REST API). Use groups to manage folder permissions for teams.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      groupId: z.number().optional().describe('Group ID (required for update and delete)'),
      name: z.string().optional().describe('Group name (required for create)'),
      notes: z.string().optional().describe('Notes about the group'),
      userIds: z.string().optional().describe('Comma-separated user IDs to add as members'),
      adminIds: z
        .string()
        .optional()
        .describe('Comma-separated user IDs to add as group admins'),
      sftpPermission: z.boolean().optional().describe('Allow SFTP access for group members'),
      ftpPermission: z
        .boolean()
        .optional()
        .describe('Allow FTP/FTPS access for group members'),
      davPermission: z.boolean().optional().describe('Allow WebDAV access for group members'),
      restapiPermission: z
        .boolean()
        .optional()
        .describe('Allow REST API access for group members'),
      allowedIps: z.string().optional().describe('Newline-delimited list of allowed IPs'),
      cursor: z.string().optional().describe('Pagination cursor (for list)'),
      perPage: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.number().describe('Group ID'),
            name: z.string().describe('Group name'),
            notes: z.string().optional().describe('Group notes'),
            userIds: z.string().optional().describe('Member user IDs'),
            adminIds: z.string().optional().describe('Admin user IDs')
          })
        )
        .optional()
        .describe('List of groups (for list action)'),
      group: z
        .object({
          groupId: z.number().describe('Group ID'),
          name: z.string().describe('Group name'),
          notes: z.string().optional().describe('Group notes')
        })
        .optional()
        .describe('Created or updated group'),
      deleted: z.boolean().optional().describe('Whether the group was deleted'),
      nextCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FilesComClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action, groupId } = ctx.input;

    if (action === 'list') {
      let result = await client.listGroups({
        cursor: ctx.input.cursor,
        perPage: ctx.input.perPage
      });

      let groups = result.groups.map((g: Record<string, unknown>) => ({
        groupId: Number(g.id),
        name: String(g.name ?? ''),
        notes: g.notes ? String(g.notes) : undefined,
        userIds: g.user_ids ? String(g.user_ids) : undefined,
        adminIds: g.admin_ids ? String(g.admin_ids) : undefined
      }));

      return {
        output: { groups, nextCursor: result.cursor },
        message: `Found **${groups.length}** groups${result.cursor ? '. More results available.' : '.'}`
      };
    }

    if (action === 'delete') {
      if (!groupId) throw new Error('groupId is required for delete');
      await client.deleteGroup(groupId);
      return {
        output: { deleted: true },
        message: `Deleted group **${groupId}**`
      };
    }

    let data: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.userIds !== undefined) data.user_ids = ctx.input.userIds;
    if (ctx.input.adminIds !== undefined) data.admin_ids = ctx.input.adminIds;
    if (ctx.input.sftpPermission !== undefined)
      data.sftp_permission = ctx.input.sftpPermission;
    if (ctx.input.ftpPermission !== undefined) data.ftp_permission = ctx.input.ftpPermission;
    if (ctx.input.davPermission !== undefined) data.dav_permission = ctx.input.davPermission;
    if (ctx.input.restapiPermission !== undefined)
      data.restapi_permission = ctx.input.restapiPermission;
    if (ctx.input.allowedIps !== undefined) data.allowed_ips = ctx.input.allowedIps;

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create');
      let result = await client.createGroup(data);
      return {
        output: {
          group: {
            groupId: Number(result.id),
            name: String(result.name ?? ''),
            notes: result.notes ? String(result.notes) : undefined
          }
        },
        message: `Created group **${result.name}** (ID: ${result.id})`
      };
    }

    // update
    if (!groupId) throw new Error('groupId is required for update');
    let result = await client.updateGroup(groupId, data);
    return {
      output: {
        group: {
          groupId: Number(result.id),
          name: String(result.name ?? ''),
          notes: result.notes ? String(result.notes) : undefined
        }
      },
      message: `Updated group **${result.name}** (ID: ${result.id})`
    };
  })
  .build();
