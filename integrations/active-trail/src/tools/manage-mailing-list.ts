import { SlateTool } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient } from '../lib/client';
import { spec } from '../spec';

let mailingListOutputSchema = z.object({
  mailingListId: z.number().describe('Mailing list ID'),
  name: z.string().describe('Mailing list name')
});

export let listMailingLists = SlateTool.create(spec, {
  name: 'List Mailing Lists',
  key: 'list_mailing_lists',
  description: `List all mailing lists in your account with pagination.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      mailingLists: z.array(mailingListOutputSchema).describe('List of mailing lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.listMailingLists({
      page: ctx.input.page,
      limit: ctx.input.limit
    });
    let lists = Array.isArray(result) ? result : [];
    return {
      output: {
        mailingLists: lists.map((l: any) => ({
          mailingListId: l.id,
          name: l.name
        }))
      },
      message: `Found **${lists.length}** mailing list(s).`
    };
  })
  .build();

export let createMailingList = SlateTool.create(spec, {
  name: 'Create Mailing List',
  key: 'create_mailing_list',
  description: `Create a new mailing list.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Name of the new mailing list')
    })
  )
  .output(mailingListOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.createMailingList({ name: ctx.input.name });
    return {
      output: { mailingListId: result.id, name: result.name },
      message: `Mailing list **${ctx.input.name}** created with ID **${result.id}**.`
    };
  })
  .build();

export let deleteMailingList = SlateTool.create(spec, {
  name: 'Delete Mailing List',
  key: 'delete_mailing_list',
  description: `Delete a mailing list by ID.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      mailingListId: z.number().describe('ID of the mailing list to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    await client.deleteMailingList(ctx.input.mailingListId);
    return {
      output: { success: true },
      message: `Mailing list **${ctx.input.mailingListId}** deleted.`
    };
  })
  .build();

export let getMailingListMembers = SlateTool.create(spec, {
  name: 'Get Mailing List Members',
  key: 'get_mailing_list_members',
  description: `Retrieve members of a mailing list with filtering by status and date range.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      mailingListId: z.number().describe('ID of the mailing list'),
      status: z
        .enum(['Active', 'Unsubscribed', 'Bounced'])
        .optional()
        .describe('Filter by member status'),
      fromDate: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      toDate: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      members: z.array(z.any()).describe('List of mailing list members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.getMailingListMembers(ctx.input.mailingListId, {
      customerStates: ctx.input.status,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      page: ctx.input.page,
      limit: ctx.input.limit
    });
    let members = Array.isArray(result) ? result : [];
    return {
      output: { members },
      message: `Found **${members.length}** member(s) in mailing list **${ctx.input.mailingListId}**.`
    };
  })
  .build();

export let addContactToMailingList = SlateTool.create(spec, {
  name: 'Add Contact to Mailing List',
  key: 'add_contact_to_mailing_list',
  description: `Add a contact to a mailing list. The contact will be created if they don't already exist. At least **email** or **sms** is required.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      mailingListId: z.number().describe('ID of the mailing list'),
      email: z.string().optional().describe('Contact email address'),
      sms: z.string().optional().describe('Contact SMS number'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name')
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

    let result = await client.addContactToMailingList(ctx.input.mailingListId, data);
    return {
      output: { contactId: result.id, email: result.email, sms: result.sms },
      message: `Contact added to mailing list **${ctx.input.mailingListId}**.`
    };
  })
  .build();
