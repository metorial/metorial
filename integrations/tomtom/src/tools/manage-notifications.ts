import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let manageContactGroup = SlateTool.create(spec, {
  name: 'Manage Contact Group',
  key: 'manage_contact_group',
  description: `Create, update, or list notification contact groups. Contact groups define where geofence alerts and other notifications are delivered, including webhook URLs and email addresses.`,
  instructions: [
    'Set action to "create" to make a new group, "update" to modify an existing one, or "list" to get all groups',
    'For "update", provide the groupId and any fields you want to change'
  ],
  constraints: ['Maximum 20 webhook addresses per contact group']
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'list']).describe('Operation to perform'),
      groupId: z.string().optional().describe('Contact group ID (required for update)'),
      groupName: z
        .string()
        .optional()
        .describe('Name for the contact group (for create/update)'),
      webhookUrls: z.array(z.string()).optional().describe('Webhook URLs for notifications'),
      emailAddresses: z
        .array(z.string())
        .optional()
        .describe('Email addresses for notifications')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Contact group identifier'),
            groupName: z.string().optional().describe('Contact group name'),
            webhookCount: z.number().optional().describe('Number of webhook contacts'),
            emailCount: z.number().optional().describe('Number of email contacts')
          })
        )
        .optional()
        .describe('List of contact groups (for list action)'),
      groupId: z.string().optional().describe('Created or updated group ID'),
      groupName: z.string().optional().describe('Created or updated group name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    if (ctx.input.action === 'list') {
      let data = await client.listContactGroups();
      let groups = (data.groups || data || []).map((g: any) => {
        let contacts = g.contacts || [];
        return {
          groupId: g.id || g.groupId,
          groupName: g.name,
          webhookCount: contacts.filter((c: any) => c.type === 'webhook').length,
          emailCount: contacts.filter((c: any) => c.type === 'email').length
        };
      });

      return {
        output: { groups },
        message: `Found **${groups.length}** contact group(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let data = await client.createContactGroup({
        name: ctx.input.groupName || 'Unnamed Group',
        webhookUrls: ctx.input.webhookUrls,
        emailAddresses: ctx.input.emailAddresses
      });

      return {
        output: {
          groupId: data.id || data.groupId,
          groupName: data.name || ctx.input.groupName
        },
        message: `Created contact group **${ctx.input.groupName}**.`
      };
    }

    // update
    let data = await client.updateContactGroup({
      groupId: ctx.input.groupId!,
      name: ctx.input.groupName,
      webhookUrls: ctx.input.webhookUrls,
      emailAddresses: ctx.input.emailAddresses
    });

    return {
      output: {
        groupId: data.id || data.groupId || ctx.input.groupId,
        groupName: data.name || ctx.input.groupName
      },
      message: `Updated contact group \`${ctx.input.groupId}\`.`
    };
  })
  .build();

export let deleteContactGroup = SlateTool.create(spec, {
  name: 'Delete Contact Group',
  key: 'delete_contact_group',
  description: `Delete a notification contact group.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the contact group to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the group was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    await client.deleteContactGroup(ctx.input.groupId);

    return {
      output: { deleted: true },
      message: `Deleted contact group \`${ctx.input.groupId}\`.`
    };
  })
  .build();
