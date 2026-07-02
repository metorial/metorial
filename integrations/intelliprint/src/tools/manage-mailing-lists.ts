import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mailingListSchema, mapMailingList, recipientSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createMailingList = SlateTool.create(spec, {
  name: 'Create Mailing List',
  key: 'create_mailing_list',
  description: `Create a new mailing list with optional initial recipients. Mailing lists can be referenced when creating print jobs to send to all recipients at once. Supports address validation as a paid add-on.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the mailing list'),
      recipients: z.array(recipientSchema).optional().describe('Initial list of recipients'),
      requestAddressValidation: z
        .boolean()
        .optional()
        .describe('Request address validation (paid add-on)')
    })
  )
  .output(mailingListSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.recipients) params.recipients = ctx.input.recipients;
    if (ctx.input.requestAddressValidation !== undefined) {
      params.address_validation = { requested: ctx.input.requestAddressValidation };
    }

    let result = await client.createMailingList(params);
    let mapped = mapMailingList(result);

    return {
      output: mapped,
      message: `Mailing list **${mapped.mailingListId}** ("${mapped.name}") created with **${mapped.recipients ?? 0}** recipient(s).`
    };
  })
  .build();

export let getMailingList = SlateTool.create(spec, {
  name: 'Get Mailing List',
  key: 'get_mailing_list',
  description: `Retrieve a mailing list's details including recipient count, template variables, and address validation status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mailingListId: z.string().describe('The ID of the mailing list to retrieve')
    })
  )
  .output(mailingListSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getMailingList(ctx.input.mailingListId);
    let mapped = mapMailingList(result);

    return {
      output: mapped,
      message: `Mailing list **${mapped.mailingListId}** ("${mapped.name}") has **${mapped.recipients ?? 0}** recipient(s).`
    };
  })
  .build();

export let listMailingLists = SlateTool.create(spec, {
  name: 'List Mailing Lists',
  key: 'list_mailing_lists',
  description: `List all mailing lists with pagination and sorting options.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().min(1).max(1000).default(10).describe('Number of results to return'),
      skip: z.number().default(0).describe('Number of results to skip for pagination'),
      sortField: z
        .enum(['created', 'name', 'recipients'])
        .optional()
        .describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort order')
    })
  )
  .output(
    z.object({
      mailingLists: z.array(mailingListSchema).describe('List of mailing lists'),
      totalAvailable: z.number().describe('Total number of mailing lists'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      sort_order: ctx.input.sortOrder
    };
    if (ctx.input.sortField) params.sort_field = ctx.input.sortField;

    let result = await client.listMailingLists(params);

    return {
      output: {
        mailingLists: result.data.map(mapMailingList),
        totalAvailable: result.total_available,
        hasMore: result.has_more
      },
      message: `Found **${result.total_available}** mailing list(s). Showing ${result.data.length} result(s).`
    };
  })
  .build();

export let updateMailingList = SlateTool.create(spec, {
  name: 'Update Mailing List',
  key: 'update_mailing_list',
  description: `Update a mailing list's name, recipients, or address validation settings. Can optionally delete existing recipients when adding new ones.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mailingListId: z.string().describe('The ID of the mailing list to update'),
      name: z.string().optional().describe('Updated mailing list name'),
      recipients: z.array(recipientSchema).optional().describe('New recipients to add'),
      deleteOldRecipients: z
        .boolean()
        .optional()
        .describe('Delete existing recipients before adding new ones'),
      requestAddressValidation: z
        .boolean()
        .optional()
        .describe('Request address validation (paid add-on)')
    })
  )
  .output(mailingListSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.recipients) params.recipients = ctx.input.recipients;
    if (ctx.input.deleteOldRecipients !== undefined)
      params.delete_old_recipients = ctx.input.deleteOldRecipients;
    if (ctx.input.requestAddressValidation !== undefined) {
      params.address_validation = { requested: ctx.input.requestAddressValidation };
    }

    let result = await client.updateMailingList(ctx.input.mailingListId, params);
    let mapped = mapMailingList(result);

    return {
      output: mapped,
      message: `Mailing list **${mapped.mailingListId}** ("${mapped.name}") updated. Now has **${mapped.recipients ?? 0}** recipient(s).`
    };
  })
  .build();

export let deleteMailingList = SlateTool.create(spec, {
  name: 'Delete Mailing List',
  key: 'delete_mailing_list',
  description: `Permanently delete a mailing list and all its recipients. This cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      mailingListId: z.string().describe('The ID of the mailing list to delete')
    })
  )
  .output(
    z.object({
      mailingListId: z.string().describe('The deleted mailing list ID'),
      deleted: z.boolean().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteMailingList(ctx.input.mailingListId);

    return {
      output: {
        mailingListId: ctx.input.mailingListId,
        deleted: true
      },
      message: `Mailing list **${ctx.input.mailingListId}** deleted.`
    };
  })
  .build();
