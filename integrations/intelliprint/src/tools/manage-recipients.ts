import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { addressSchema, mailingListRecipientSchema, mapRecipient } from '../lib/schemas';
import { spec } from '../spec';

export let addRecipient = SlateTool.create(spec, {
  name: 'Add Recipient',
  key: 'add_recipient',
  description: `Add a new recipient to an existing mailing list. Provide the recipient's address and optionally template variable values for personalized content.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mailingListId: z.string().describe('The mailing list to add the recipient to'),
      address: addressSchema.describe('Recipient address'),
      variables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Template variable values for personalization')
    })
  )
  .output(mailingListRecipientSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      address: ctx.input.address
    };
    if (ctx.input.variables) params.variables = ctx.input.variables;

    let result = await client.createRecipient(ctx.input.mailingListId, params);
    let mapped = mapRecipient(result);

    return {
      output: mapped,
      message:
        `Recipient **${mapped.recipientId}** added to mailing list. Address: ${mapped.address?.name ?? ''} ${mapped.address?.line ?? ''}`.trim()
    };
  })
  .build();

export let getRecipient = SlateTool.create(spec, {
  name: 'Get Recipient',
  key: 'get_recipient',
  description: `Retrieve a specific recipient from a mailing list including their address, template variables, and address validation status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mailingListId: z.string().describe('The mailing list the recipient belongs to'),
      recipientId: z.string().describe('The recipient ID to retrieve')
    })
  )
  .output(mailingListRecipientSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getRecipient(ctx.input.mailingListId, ctx.input.recipientId);
    let mapped = mapRecipient(result);

    return {
      output: mapped,
      message:
        `Recipient **${mapped.recipientId}**: ${mapped.address?.name ?? ''} (${mapped.addressValidationStatus ?? 'unknown'})`.trim()
    };
  })
  .build();

export let listRecipients = SlateTool.create(spec, {
  name: 'List Recipients',
  key: 'list_recipients',
  description: `List all recipients in a mailing list with pagination support.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mailingListId: z.string().describe('The mailing list to list recipients from'),
      limit: z.number().min(1).max(1000).default(10).describe('Number of results to return'),
      skip: z.number().default(0).describe('Number of results to skip for pagination'),
      sortField: z.enum(['created', 'name']).optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort order')
    })
  )
  .output(
    z.object({
      recipients: z.array(mailingListRecipientSchema).describe('List of recipients'),
      totalAvailable: z.number().describe('Total number of recipients'),
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

    let result = await client.listRecipients(ctx.input.mailingListId, params);

    return {
      output: {
        recipients: result.data.map(mapRecipient),
        totalAvailable: result.total_available,
        hasMore: result.has_more
      },
      message: `Found **${result.total_available}** recipient(s). Showing ${result.data.length} result(s).`
    };
  })
  .build();

export let updateRecipient = SlateTool.create(spec, {
  name: 'Update Recipient',
  key: 'update_recipient',
  description: `Update a recipient's address or template variable values in a mailing list.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mailingListId: z.string().describe('The mailing list the recipient belongs to'),
      recipientId: z.string().describe('The recipient ID to update'),
      address: addressSchema.optional().describe('Updated recipient address'),
      variables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated template variable values')
    })
  )
  .output(mailingListRecipientSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};
    if (ctx.input.address) params.address = ctx.input.address;
    if (ctx.input.variables) params.variables = ctx.input.variables;

    let result = await client.updateRecipient(
      ctx.input.mailingListId,
      ctx.input.recipientId,
      params
    );
    let mapped = mapRecipient(result);

    return {
      output: mapped,
      message: `Recipient **${mapped.recipientId}** updated.`
    };
  })
  .build();

export let deleteRecipient = SlateTool.create(spec, {
  name: 'Delete Recipient',
  key: 'delete_recipient',
  description: `Remove a recipient from a mailing list. This cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      mailingListId: z.string().describe('The mailing list the recipient belongs to'),
      recipientId: z.string().describe('The recipient ID to delete')
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('The deleted recipient ID'),
      deleted: z.boolean().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteRecipient(ctx.input.mailingListId, ctx.input.recipientId);

    return {
      output: {
        recipientId: ctx.input.recipientId,
        deleted: true
      },
      message: `Recipient **${ctx.input.recipientId}** removed from mailing list.`
    };
  })
  .build();
