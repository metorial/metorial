import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer record in Gorgias with contact channels, name, and metadata.`
})
  .input(
    z.object({
      email: z.string().optional().describe('Primary email address'),
      name: z.string().optional().describe('Full display name'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      language: z.string().optional().describe('Language code (e.g., "en")'),
      timezone: z.string().optional().describe('Timezone (e.g., "America/New_York")'),
      externalId: z.string().optional().describe('External system identifier'),
      channels: z
        .array(
          z.object({
            type: z
              .enum(['email', 'phone', 'facebook', 'twitter', 'instagram'])
              .describe('Channel type'),
            address: z.string().describe('Channel address (email, phone number, etc.)'),
            preferred: z.boolean().optional().describe('Whether this is the preferred channel')
          })
        )
        .optional()
        .describe('Contact channels'),
      note: z.string().optional().describe('Internal note about the customer'),
      meta: z.record(z.string(), z.any()).optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('ID of the created customer'),
      email: z.string().nullable().describe('Customer email'),
      name: z.string().nullable().describe('Customer name'),
      createdDatetime: z.string().nullable().describe('When the customer was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let data: any = {};
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.firstname) data.firstname = ctx.input.firstname;
    if (ctx.input.lastname) data.lastname = ctx.input.lastname;
    if (ctx.input.language) data.language = ctx.input.language;
    if (ctx.input.timezone) data.timezone = ctx.input.timezone;
    if (ctx.input.externalId) data.external_id = ctx.input.externalId;
    if (ctx.input.channels) data.channels = ctx.input.channels;
    if (ctx.input.note) data.note = ctx.input.note;
    if (ctx.input.meta) data.meta = ctx.input.meta;

    let customer = await client.createCustomer(data);

    return {
      output: {
        customerId: customer.id,
        email: customer.email || null,
        name: customer.name || null,
        createdDatetime: customer.created_datetime || null
      },
      message: `Created customer **#${customer.id}** — ${customer.email || customer.name || 'No identifier'}.`
    };
  })
  .build();

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer's profile, contact channels, or metadata. Only provide the fields you want to change.`
})
  .input(
    z.object({
      customerId: z.number().describe('ID of the customer to update'),
      email: z.string().optional().describe('New primary email address'),
      name: z.string().optional().describe('New display name'),
      firstname: z.string().optional().describe('New first name'),
      lastname: z.string().optional().describe('New last name'),
      language: z.string().optional().describe('Language code'),
      timezone: z.string().optional().describe('Timezone'),
      externalId: z.string().optional().describe('External system identifier'),
      channels: z
        .array(
          z.object({
            type: z
              .enum(['email', 'phone', 'facebook', 'twitter', 'instagram'])
              .describe('Channel type'),
            address: z.string().describe('Channel address'),
            preferred: z.boolean().optional().describe('Whether this is the preferred channel')
          })
        )
        .optional()
        .describe('Updated contact channels'),
      note: z.string().optional().describe('Internal note'),
      meta: z.record(z.string(), z.any()).optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Customer ID'),
      email: z.string().nullable().describe('Updated email'),
      name: z.string().nullable().describe('Updated name'),
      updatedDatetime: z.string().nullable().describe('When the customer was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let data: any = {};
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.firstname) data.firstname = ctx.input.firstname;
    if (ctx.input.lastname) data.lastname = ctx.input.lastname;
    if (ctx.input.language) data.language = ctx.input.language;
    if (ctx.input.timezone) data.timezone = ctx.input.timezone;
    if (ctx.input.externalId) data.external_id = ctx.input.externalId;
    if (ctx.input.channels) data.channels = ctx.input.channels;
    if (ctx.input.note) data.note = ctx.input.note;
    if (ctx.input.meta) data.meta = ctx.input.meta;

    let customer = await client.updateCustomer(ctx.input.customerId, data);

    return {
      output: {
        customerId: customer.id,
        email: customer.email || null,
        name: customer.name || null,
        updatedDatetime: customer.updated_datetime || null
      },
      message: `Updated customer **#${customer.id}** — ${customer.email || customer.name || 'No identifier'}.`
    };
  })
  .build();

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve full details of a customer, including their contact channels, metadata, and associated data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('ID of the customer to retrieve')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Customer ID'),
      email: z.string().nullable().describe('Primary email'),
      name: z.string().nullable().describe('Display name'),
      firstname: z.string().nullable().describe('First name'),
      lastname: z.string().nullable().describe('Last name'),
      language: z.string().nullable().describe('Language code'),
      timezone: z.string().nullable().describe('Timezone'),
      externalId: z.string().nullable().describe('External ID'),
      channels: z
        .array(
          z.object({
            type: z.string().describe('Channel type'),
            address: z.string().describe('Channel address'),
            preferred: z.boolean().describe('Whether preferred')
          })
        )
        .describe('Contact channels'),
      note: z.string().nullable().describe('Internal note'),
      meta: z.record(z.string(), z.any()).nullable().describe('Custom metadata'),
      createdDatetime: z.string().nullable().describe('When the customer was created'),
      updatedDatetime: z.string().nullable().describe('When the customer was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let c = await client.getCustomer(ctx.input.customerId);

    return {
      output: {
        customerId: c.id,
        email: c.email || null,
        name: c.name || null,
        firstname: c.firstname || null,
        lastname: c.lastname || null,
        language: c.language || null,
        timezone: c.timezone || null,
        externalId: c.external_id || null,
        channels: (c.channels || []).map((ch: any) => ({
          type: ch.type,
          address: ch.address,
          preferred: ch.preferred || false
        })),
        note: c.note || null,
        meta: c.meta || null,
        createdDatetime: c.created_datetime || null,
        updatedDatetime: c.updated_datetime || null
      },
      message: `Retrieved customer **#${c.id}** — ${c.email || c.name || 'No identifier'}.`
    };
  })
  .build();

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve a paginated list of customers. Can filter by email address.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Number of customers to return'),
      email: z.string().optional().describe('Filter by email address')
    })
  )
  .output(
    z.object({
      customers: z.array(
        z.object({
          customerId: z.number().describe('Customer ID'),
          email: z.string().nullable().describe('Primary email'),
          name: z.string().nullable().describe('Display name'),
          createdDatetime: z.string().nullable().describe('When the customer was created')
        })
      ),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.listCustomers({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      email: ctx.input.email
    });

    let customers = result.data.map((c: any) => ({
      customerId: c.id,
      email: c.email || null,
      name: c.name || null,
      createdDatetime: c.created_datetime || null
    }));

    return {
      output: {
        customers,
        nextCursor: result.meta.next_cursor,
        prevCursor: result.meta.prev_cursor
      },
      message: `Found **${customers.length}** customer(s).${result.meta.next_cursor ? ' More results available.' : ''}`
    };
  })
  .build();

export let mergeCustomers = SlateTool.create(spec, {
  name: 'Merge Customers',
  key: 'merge_customers',
  description: `Merge multiple customer records into one. The main customer retains its data, and secondary customers' data is merged into it. Secondary customer records are deleted after merging.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      mainCustomerId: z.number().describe('ID of the primary customer to keep'),
      secondaryCustomerIds: z
        .array(z.number())
        .describe('IDs of customer records to merge into the main customer')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('ID of the merged customer'),
      email: z.string().nullable().describe('Customer email'),
      name: z.string().nullable().describe('Customer name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.mergeCustomers(
      ctx.input.mainCustomerId,
      ctx.input.secondaryCustomerIds
    );

    return {
      output: {
        customerId: result.id,
        email: result.email || null,
        name: result.name || null
      },
      message: `Merged **${ctx.input.secondaryCustomerIds.length}** customer(s) into customer **#${ctx.input.mainCustomerId}**.`
    };
  })
  .build();
