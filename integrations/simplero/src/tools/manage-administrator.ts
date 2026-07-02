import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let manageAdministrator = SlateTool.create(spec, {
  name: 'Manage Administrator',
  key: 'manage_administrator',
  description: `List, create, update, find, or remove account administrators in Simplero. Supports assigning system roles (Co-Owner=1, Admin=2, Basic admin=3, Assistant=8, Support specialist=9, Affiliate manager=10) or custom roles. Can auto-generate credentials and send invitation messages.`,
  instructions: [
    'Use action "list_roles" to retrieve available admin roles and their IDs.',
    'System role IDs: Co-Owner=1, Admin=2, Basic admin=3, Assistant=8, Support specialist=9, Affiliate manager=10.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'find', 'create_or_update', 'remove', 'list_roles'])
        .describe('Action to perform'),
      administratorId: z.string().optional().describe('Administrator ID (for get/remove)'),
      email: z.string().optional().describe('Administrator email (for find/create/update)'),
      adminRoleId: z
        .number()
        .optional()
        .describe('Admin role ID (required for create/update)'),
      ticketAssignee: z
        .boolean()
        .optional()
        .describe('Whether this admin can be assigned tickets'),
      showOnTicket: z
        .boolean()
        .optional()
        .describe('Whether this admin is visible on ticket forms'),
      autogenerate: z
        .boolean()
        .optional()
        .describe('Auto-generate credentials for the new admin'),
      inviteeName: z.string().optional().describe('Name of the invitee'),
      inviterEmail: z.string().optional().describe('Email of the person sending the invite'),
      inviteMessage: z
        .string()
        .optional()
        .describe('Custom message to include in the invitation')
    })
  )
  .output(
    z.object({
      administrator: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Administrator record'),
      administrators: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of administrator records'),
      roles: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of admin roles'),
      success: z.boolean().optional().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });

    if (ctx.input.action === 'list') {
      let administrators = await client.listAdministrators();
      return {
        output: { administrators },
        message: `Found **${administrators.length}** administrator(s).`
      };
    }

    if (ctx.input.action === 'list_roles') {
      let roles = await client.listAdminRoles();
      return {
        output: { roles },
        message: `Found **${roles.length}** admin role(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.administratorId) throw new Error('administratorId is required.');
      let administrator = await client.getAdministrator(ctx.input.administratorId);
      return {
        output: { administrator },
        message: `Retrieved administrator (ID: ${administrator.id}).`
      };
    }

    if (ctx.input.action === 'find') {
      if (!ctx.input.email) throw new Error('email is required.');
      let administrator = await client.findAdministrator(ctx.input.email);
      return {
        output: { administrator },
        message: `Found administrator for **${ctx.input.email}** (ID: ${administrator.id}).`
      };
    }

    if (ctx.input.action === 'create_or_update') {
      if (!ctx.input.email) throw new Error('email is required.');
      if (!ctx.input.adminRoleId) throw new Error('adminRoleId is required.');
      let administrator = await client.createOrUpdateAdministrator({
        email: ctx.input.email,
        adminRoleId: ctx.input.adminRoleId,
        ticketAssignee: ctx.input.ticketAssignee,
        showOnTicket: ctx.input.showOnTicket,
        autogenerate: ctx.input.autogenerate,
        inviteeName: ctx.input.inviteeName,
        inviterEmail: ctx.input.inviterEmail,
        message: ctx.input.inviteMessage
      });
      return {
        output: { administrator },
        message: `Administrator **${ctx.input.email}** created/updated (ID: ${administrator.id}).`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.administratorId) throw new Error('administratorId is required.');
      await client.removeAdministrator(ctx.input.administratorId);
      return {
        output: { success: true },
        message: `Administrator **${ctx.input.administratorId}** removed.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
