import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let listOutputSchema = z.object({
  listId: z.string().describe('Unique identifier of the list'),
  name: z.string().describe('Name of the list'),
  state: z.string().describe('Current state of the list'),
  remarks: z.string().describe('Notes or remarks on the list'),
  subscribeNotificationEmail: z.string().describe('Email notified on new subscriptions'),
  unsubscribeNotificationEmail: z.string().describe('Email notified on unsubscriptions'),
  created: z.string().describe('Creation timestamp'),
  modified: z.string().describe('Last modified timestamp'),
  members: z
    .object({
      active: z.number().describe('Number of active subscribers'),
      unsubscribed: z.number().describe('Number of unsubscribed members'),
      cleaned: z.number().describe('Number of cleaned (bounced) members')
    })
    .describe('Subscriber count breakdown')
});

export let createList = SlateTool.create(spec, {
  name: 'Create List',
  key: 'create_list',
  description: `Creates a new mailing list in Laposta. You can configure notification emails for subscribe/unsubscribe events and optionally lock the list to prevent UI modifications.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the mailing list'),
      remarks: z.string().optional().describe('Notes or description for the list'),
      locked: z
        .boolean()
        .optional()
        .describe('Whether the list is locked from UI modifications'),
      subscribeNotificationEmail: z
        .string()
        .optional()
        .describe('Email address notified when someone subscribes'),
      unsubscribeNotificationEmail: z
        .string()
        .optional()
        .describe('Email address notified when someone unsubscribes')
    })
  )
  .output(listOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createList({
      name: ctx.input.name,
      remarks: ctx.input.remarks,
      locked: ctx.input.locked,
      subscribe_notification_email: ctx.input.subscribeNotificationEmail,
      unsubscribe_notification_email: ctx.input.unsubscribeNotificationEmail
    });

    let list = result.list;
    return {
      output: {
        listId: list.list_id,
        name: list.name,
        state: list.state,
        remarks: list.remarks,
        subscribeNotificationEmail: list.subscribe_notification_email,
        unsubscribeNotificationEmail: list.unsubscribe_notification_email,
        created: list.created,
        modified: list.modified,
        members: list.members
      },
      message: `Created mailing list **${list.name}** (${list.list_id}).`
    };
  })
  .build();

export let getList = SlateTool.create(spec, {
  name: 'Get Lists',
  key: 'get_lists',
  description: `Retrieves mailing lists from Laposta. Provide a **listId** to get a specific list, or omit it to retrieve all lists. Returns list details including subscriber counts by status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z
        .string()
        .optional()
        .describe('ID of a specific list to retrieve. Omit to get all lists.')
    })
  )
  .output(
    z.object({
      lists: z.array(listOutputSchema).describe('Retrieved mailing lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.listId) {
      let result = await client.getList(ctx.input.listId);
      let list = result.list;
      let output = {
        listId: list.list_id,
        name: list.name,
        state: list.state,
        remarks: list.remarks,
        subscribeNotificationEmail: list.subscribe_notification_email,
        unsubscribeNotificationEmail: list.unsubscribe_notification_email,
        created: list.created,
        modified: list.modified,
        members: list.members
      };
      return {
        output: { lists: [output] },
        message: `Retrieved list **${list.name}** with ${list.members.active} active subscribers.`
      };
    }

    let results = await client.getLists();
    let lists = results.map(r => {
      let list = r.list;
      return {
        listId: list.list_id,
        name: list.name,
        state: list.state,
        remarks: list.remarks,
        subscribeNotificationEmail: list.subscribe_notification_email,
        unsubscribeNotificationEmail: list.unsubscribe_notification_email,
        created: list.created,
        modified: list.modified,
        members: list.members
      };
    });

    return {
      output: { lists },
      message: `Retrieved ${lists.length} mailing list(s).`
    };
  })
  .build();

export let updateList = SlateTool.create(spec, {
  name: 'Update List',
  key: 'update_list',
  description: `Updates an existing mailing list's properties in Laposta. Only the provided fields will be changed; omitted fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to update'),
      name: z.string().optional().describe('New name for the list'),
      remarks: z.string().optional().describe('Updated notes for the list'),
      locked: z
        .boolean()
        .optional()
        .describe('Whether the list is locked from UI modifications'),
      subscribeNotificationEmail: z
        .string()
        .optional()
        .describe('Email address notified on new subscriptions'),
      unsubscribeNotificationEmail: z
        .string()
        .optional()
        .describe('Email address notified on unsubscriptions')
    })
  )
  .output(listOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateList(ctx.input.listId, {
      name: ctx.input.name,
      remarks: ctx.input.remarks,
      locked: ctx.input.locked,
      subscribe_notification_email: ctx.input.subscribeNotificationEmail,
      unsubscribe_notification_email: ctx.input.unsubscribeNotificationEmail
    });

    let list = result.list;
    return {
      output: {
        listId: list.list_id,
        name: list.name,
        state: list.state,
        remarks: list.remarks,
        subscribeNotificationEmail: list.subscribe_notification_email,
        unsubscribeNotificationEmail: list.unsubscribe_notification_email,
        created: list.created,
        modified: list.modified,
        members: list.members
      },
      message: `Updated list **${list.name}** (${list.list_id}).`
    };
  })
  .build();

export let deleteList = SlateTool.create(spec, {
  name: 'Delete List',
  key: 'delete_list',
  description: `Permanently deletes a mailing list from Laposta. This removes the list and all associated subscriber data. Use **purge** mode to remove all active subscribers without deleting the list itself.`,
  constraints: [
    'Deleting a list is irreversible and removes all subscriber data.',
    'Purging removes only active subscribers; the list and its configuration remain.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to delete or purge'),
      purgeOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, removes all active subscribers but keeps the list. Defaults to false (full delete).'
        )
    })
  )
  .output(listOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = ctx.input.purgeOnly
      ? await client.purgeList(ctx.input.listId)
      : await client.deleteList(ctx.input.listId);

    let list = result.list;
    let action = ctx.input.purgeOnly ? 'Purged all active subscribers from' : 'Deleted';
    return {
      output: {
        listId: list.list_id,
        name: list.name,
        state: list.state,
        remarks: list.remarks,
        subscribeNotificationEmail: list.subscribe_notification_email,
        unsubscribeNotificationEmail: list.unsubscribe_notification_email,
        created: list.created,
        modified: list.modified,
        members: list.members
      },
      message: `${action} list **${list.name}** (${list.list_id}).`
    };
  })
  .build();
