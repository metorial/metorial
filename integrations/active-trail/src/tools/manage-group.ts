import { SlateTool } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient } from '../lib/client';
import { spec } from '../spec';

let groupOutputSchema = z.object({
  groupId: z.number().describe('Group ID'),
  name: z.string().describe('Group name'),
  activeCounter: z.number().optional().describe('Number of active contacts'),
  counter: z.number().optional().describe('Total contacts in group'),
  created: z.string().nullable().optional().describe('Date created')
});

let mapGroupFromApi = (raw: any) => ({
  groupId: raw.id,
  name: raw.name,
  activeCounter: raw.active_counter,
  counter: raw.counter,
  created: raw.created
});

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List all contact groups in your account with pagination support.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page (default 20)')
    })
  )
  .output(
    z.object({
      groups: z.array(groupOutputSchema).describe('List of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.listGroups({ page: ctx.input.page, limit: ctx.input.limit });
    let groups = Array.isArray(result) ? result : [];
    return {
      output: { groups: groups.map(mapGroupFromApi) },
      message: `Found **${groups.length}** group(s).`
    };
  })
  .build();

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Retrieve group details by ID, optionally including members and group events (opens, clicks, unsubscribes).`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group'),
      includeMembers: z.boolean().optional().describe('Include group members'),
      memberStatus: z
        .enum(['Active', 'Unsubscribed', 'Bounced'])
        .optional()
        .describe('Filter members by status'),
      includeEvents: z.boolean().optional().describe('Include group events'),
      page: z.number().optional().describe('Page for members pagination'),
      limit: z.number().optional().describe('Limit for members pagination')
    })
  )
  .output(
    z.object({
      group: groupOutputSchema,
      members: z.array(z.any()).optional().describe('Group members'),
      events: z.array(z.any()).optional().describe('Group events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let group = await client.getGroup(ctx.input.groupId);
    let output: Record<string, any> = { group: mapGroupFromApi(group) };

    if (ctx.input.includeMembers) {
      output.members = await client.getGroupMembers(ctx.input.groupId, {
        customerStates: ctx.input.memberStatus,
        page: ctx.input.page,
        limit: ctx.input.limit
      });
    }
    if (ctx.input.includeEvents) {
      output.events = await client.getGroupEvents(ctx.input.groupId);
    }

    return {
      output: output as any,
      message: `Retrieved group **${group.name}** (ID: ${group.id}).`
    };
  })
  .build();

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new contact group.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Name of the new group')
    })
  )
  .output(groupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.createGroup({ name: ctx.input.name });
    return {
      output: mapGroupFromApi(result),
      message: `Group **${ctx.input.name}** created with ID **${result.id}**.`
    };
  })
  .build();

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update an existing group's name.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group to update'),
      name: z.string().describe('New name for the group')
    })
  )
  .output(groupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.updateGroup(ctx.input.groupId, { name: ctx.input.name });
    return {
      output: mapGroupFromApi(result),
      message: `Group **${ctx.input.groupId}** updated to **${ctx.input.name}**.`
    };
  })
  .build();

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Delete a contact group by ID. Contacts in the group are not deleted.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    await client.deleteGroup(ctx.input.groupId);
    return {
      output: { success: true },
      message: `Group **${ctx.input.groupId}** deleted.`
    };
  })
  .build();

export let addContactToGroup = SlateTool.create(spec, {
  name: 'Add Contact to Group',
  key: 'add_contact_to_group',
  description: `Add a contact to a group by providing contact details. The contact will be created if they don't already exist. At least **email** or **sms** is required.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group'),
      email: z.string().optional().describe('Contact email address'),
      sms: z.string().optional().describe('Contact SMS number'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      status: z
        .enum(['Active', 'Unsubscribed'])
        .optional()
        .describe('Subscription status for this group')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the contact added'),
      email: z.string().nullable().optional().describe('Contact email'),
      sms: z.string().nullable().optional().describe('Contact SMS number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let data: Record<string, any> = {};
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.sms) data.sms = ctx.input.sms;
    if (ctx.input.firstName) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName) data.last_name = ctx.input.lastName;
    if (ctx.input.status) data.status = ctx.input.status;

    let result = await client.addContactToGroup(ctx.input.groupId, data);
    return {
      output: {
        contactId: result.id,
        email: result.email,
        sms: result.sms
      },
      message: `Contact **${result.email || result.sms}** added to group **${ctx.input.groupId}**.`
    };
  })
  .build();

export let removeContactFromGroup = SlateTool.create(spec, {
  name: 'Remove Contact from Group',
  key: 'remove_contact_from_group',
  description: `Remove a contact from a group. The contact is not deleted, only unlinked from the group.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group'),
      contactId: z.number().describe('ID of the contact to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    await client.removeContactFromGroup(ctx.input.groupId, ctx.input.contactId);
    return {
      output: { success: true },
      message: `Contact **${ctx.input.contactId}** removed from group **${ctx.input.groupId}**.`
    };
  })
  .build();
