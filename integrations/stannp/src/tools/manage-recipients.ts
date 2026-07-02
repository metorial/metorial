import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientOutputSchema = z.object({
  recipientId: z.string().describe('Recipient ID'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().optional().describe('Last name'),
  company: z.string().optional().describe('Company name'),
  email: z.string().optional().describe('Email address'),
  address1: z.string().optional().describe('Primary address line'),
  address2: z.string().optional().describe('Secondary address line'),
  city: z.string().optional().describe('City'),
  country: z.string().optional().describe('Country code'),
  postcode: z.string().optional().describe('Postal/zip code')
});

let mapRecipient = (r: any) => ({
  recipientId: String(r.id),
  firstname: r.firstname,
  lastname: r.lastname,
  company: r.company,
  email: r.email,
  address1: r.address1,
  address2: r.address2,
  city: r.city,
  country: r.country,
  postcode: r.postcode || r.zipcode
});

// ---- List Recipients ----

export let listRecipients = SlateTool.create(spec, {
  name: 'List Recipients',
  key: 'list_recipients',
  description: `Retrieve a paginated list of recipients. Optionally filter by group ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.number().optional().describe('Filter recipients by group/mailing list ID'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of recipients to return')
    })
  )
  .output(
    z.object({
      recipients: z.array(recipientOutputSchema).describe('List of recipients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.listRecipients({
      groupId: ctx.input.groupId,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let recipients = Array.isArray(result) ? result.map(mapRecipient) : [];

    return {
      output: { recipients },
      message: `Found **${recipients.length}** recipients.`
    };
  })
  .build();

// ---- Get Recipient ----

export let getRecipient = SlateTool.create(spec, {
  name: 'Get Recipient',
  key: 'get_recipient',
  description: `Retrieve detailed information about a single recipient by their ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      recipientId: z.number().describe('Recipient ID to look up')
    })
  )
  .output(recipientOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.getRecipient(ctx.input.recipientId);

    return {
      output: mapRecipient(result),
      message: `Retrieved recipient **${result.firstname || ''} ${result.lastname || ''}** (ID: ${result.id}).`
    };
  })
  .build();

// ---- Create Recipient ----

export let createRecipient = SlateTool.create(spec, {
  name: 'Create Recipient',
  key: 'create_recipient',
  description: `Add a new recipient to a mailing group. Duplicate handling can be configured to update, ignore, or create a duplicate entry.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.number().describe('Group/mailing list ID to add the recipient to'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      address1: z.string().describe('Primary address line'),
      address2: z.string().optional().describe('Secondary address line'),
      address3: z.string().optional().describe('Third address line'),
      city: z.string().optional().describe('City'),
      postcode: z.string().optional().describe('Postal/zip code'),
      country: z.string().optional().describe('ISO 3166-1 Alpha-2 country code (e.g. US, GB)'),
      company: z.string().optional().describe('Company name'),
      email: z.string().optional().describe('Email address'),
      phoneNumber: z.string().optional().describe('Phone number'),
      refId: z
        .string()
        .optional()
        .describe('External reference ID for mapping to your system'),
      onDuplicate: z
        .enum(['update', 'ignore', 'duplicate'])
        .optional()
        .describe('How to handle duplicate recipients'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('ID of the created or matched recipient'),
      valid: z.boolean().optional().describe('Whether the address was validated successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let customFields: Record<string, string> | undefined;
    if (ctx.input.customFields) {
      customFields = {};
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        customFields[key] = String(value);
      }
    }

    let result = await client.createRecipient({
      groupId: ctx.input.groupId,
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      address1: ctx.input.address1,
      address2: ctx.input.address2,
      address3: ctx.input.address3,
      city: ctx.input.city,
      postcode: ctx.input.postcode,
      country: ctx.input.country,
      company: ctx.input.company,
      email: ctx.input.email,
      phoneNumber: ctx.input.phoneNumber,
      refId: ctx.input.refId,
      onDuplicate: ctx.input.onDuplicate,
      customFields
    });

    return {
      output: {
        recipientId: String(result.id),
        valid: result.valid
      },
      message: `Recipient created with ID **${result.id}**. Address valid: ${result.valid ?? 'unknown'}.`
    };
  })
  .build();

// ---- Delete Recipient ----

export let deleteRecipient = SlateTool.create(spec, {
  name: 'Delete Recipient',
  key: 'delete_recipient',
  description: `Permanently remove a recipient from the account by their ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientId: z.number().describe('ID of the recipient to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.deleteRecipient(ctx.input.recipientId);

    return {
      output: { success: result.success === true },
      message: `Recipient **${ctx.input.recipientId}** deleted.`
    };
  })
  .build();
