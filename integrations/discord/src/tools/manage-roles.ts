import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let roleOutputSchema = z.object({
  roleId: z.string().describe('Role ID'),
  name: z.string().describe('Role name'),
  color: z.number().describe('Role color as integer'),
  hoist: z.boolean().describe('Whether the role is displayed separately in the sidebar'),
  position: z.number().describe('Role position in the hierarchy'),
  permissions: z.string().describe('Permission bitfield as string'),
  mentionable: z.boolean().describe('Whether the role can be mentioned by anyone')
});

let mapRoleToOutput = (role: any) => ({
  roleId: role.id,
  name: role.name,
  color: role.color,
  hoist: role.hoist,
  position: role.position,
  permissions: role.permissions,
  mentionable: role.mentionable
});

export let manageRoles = SlateTool.create(spec, {
  name: 'Manage Roles',
  key: 'manage_roles',
  description: `List, create, update, or delete roles in a Discord guild. Also supports assigning or removing roles from guild members.`,
  instructions: [
    'Use "list" to retrieve all roles in a guild before creating or modifying roles',
    'Role color is an integer representation of a hex color code (e.g., 0xFF0000 = 16711680 for red)',
    'The permissions field is a bitfield string; refer to Discord documentation for permission values',
    'Role assignment and removal require the bot to have the Manage Roles permission and a higher role than the target role'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageRoles)
  .input(
    // One object schema (no top-level oneOf); per-action requirements are checked at runtime.
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete', 'assign', 'remove'])
        .describe(
          'list/create/update/delete manage guild roles; assign/remove add or take a role from a member'
        ),
      guildId: z.string().describe('Guild (server) ID'),
      roleId: z
        .string()
        .optional()
        .describe('Role ID (required for update, delete, assign, and remove)'),
      userId: z
        .string()
        .optional()
        .describe('ID of the member (required for assign and remove)'),
      name: z
        .string()
        .optional()
        .describe('Role name (required for create; optional for update)'),
      permissions: z.string().optional().describe('Permission bitfield as string'),
      color: z.number().optional().describe('Role color as integer (e.g., 16711680 for red)'),
      hoist: z
        .boolean()
        .optional()
        .describe('Whether the role should be displayed separately in the sidebar'),
      mentionable: z
        .boolean()
        .optional()
        .describe('Whether the role can be mentioned by anyone')
    })
  )
  .output(
    z.object({
      roles: z.array(roleOutputSchema).optional().describe('List of roles (for list action)'),
      role: roleOutputSchema
        .optional()
        .describe('Created or updated role (for create/update actions)'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the operation succeeded (for delete/assign/remove actions)')
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let { action, guildId } = input;

    let requireRoleId = () => {
      if (!input.roleId)
        throw discordServiceError(`roleId is required for the ${action} action`);
      return input.roleId;
    };
    let requireUserId = () => {
      if (!input.userId)
        throw discordServiceError(`userId is required for the ${action} action`);
      return input.userId;
    };

    if (action === 'list') {
      let roles = await client.getGuildRoles(guildId);
      let mapped = roles.map(mapRoleToOutput);
      return {
        output: { roles: mapped },
        message: `Found **${mapped.length}** roles in guild \`${guildId}\`.`
      };
    }

    if (action === 'create') {
      if (!input.name) throw discordServiceError('name is required for the create action');
      let data: Record<string, any> = { name: input.name };
      if (input.permissions !== undefined) data.permissions = input.permissions;
      if (input.color !== undefined) data.color = input.color;
      if (input.hoist !== undefined) data.hoist = input.hoist;
      if (input.mentionable !== undefined) data.mentionable = input.mentionable;

      let role = await client.createGuildRole(guildId, data);
      return {
        output: { role: mapRoleToOutput(role) },
        message: `Created role **${role.name}** in guild \`${guildId}\`.`
      };
    }

    if (action === 'update') {
      let data: Record<string, any> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.permissions !== undefined) data.permissions = input.permissions;
      if (input.color !== undefined) data.color = input.color;
      if (input.hoist !== undefined) data.hoist = input.hoist;
      if (input.mentionable !== undefined) data.mentionable = input.mentionable;

      let role = await client.modifyGuildRole(guildId, requireRoleId(), data);
      return {
        output: { role: mapRoleToOutput(role) },
        message: `Updated role **${role.name}** in guild \`${guildId}\`.`
      };
    }

    if (action === 'delete') {
      await client.deleteGuildRole(guildId, requireRoleId());
      return {
        output: { success: true },
        message: `Deleted role \`${input.roleId}\` from guild \`${guildId}\`.`
      };
    }

    if (action === 'assign') {
      await client.addGuildMemberRole(guildId, requireUserId(), requireRoleId());
      return {
        output: { success: true },
        message: `Assigned role \`${input.roleId}\` to user \`${input.userId}\` in guild \`${guildId}\`.`
      };
    }

    if (action === 'remove') {
      await client.removeGuildMemberRole(guildId, requireUserId(), requireRoleId());
      return {
        output: { success: true },
        message: `Removed role \`${input.roleId}\` from user \`${input.userId}\` in guild \`${guildId}\`.`
      };
    }

    throw discordServiceError(`Unknown action: ${action}`);
  })
  .build();
