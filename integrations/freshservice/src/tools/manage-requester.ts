import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRequester = SlateTool.create(spec, {
  name: 'Create Requester',
  key: 'create_requester',
  description: `Create a new requester (end user/contact) in Freshservice. Requesters are the users who raise tickets.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the requester'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Primary email address'),
      phone: z.string().optional().describe('Phone number'),
      departmentIds: z
        .array(z.number())
        .optional()
        .describe('Department IDs the requester belongs to'),
      customFields: z.record(z.string(), z.unknown()).optional().describe('Custom fields')
    })
  )
  .output(
    z.object({
      requesterId: z.number().describe('ID of the created requester'),
      firstName: z.string().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      email: z.string().nullable().describe('Primary email'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let requester = await client.createRequester(ctx.input);

    return {
      output: {
        requesterId: requester.id,
        firstName: requester.first_name,
        lastName: requester.last_name,
        email: requester.primary_email,
        createdAt: requester.created_at
      },
      message:
        `Created requester **#${requester.id}**: "${requester.first_name} ${requester.last_name || ''}"`.trim()
    };
  })
  .build();

export let getRequester = SlateTool.create(spec, {
  name: 'Get Requester',
  key: 'get_requester',
  description: `Retrieve a single requester by their ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      requesterId: z.number().describe('ID of the requester')
    })
  )
  .output(
    z.object({
      requesterId: z.number().describe('ID of the requester'),
      firstName: z.string().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      email: z.string().nullable().describe('Primary email'),
      phone: z.string().nullable().describe('Phone number'),
      active: z.boolean().describe('Whether the requester is active'),
      departmentIds: z.array(z.number()).nullable().describe('Department IDs'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      customFields: z.record(z.string(), z.unknown()).nullable().describe('Custom fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let requester = await client.getRequester(ctx.input.requesterId);

    return {
      output: {
        requesterId: requester.id,
        firstName: requester.first_name,
        lastName: requester.last_name,
        email: requester.primary_email,
        phone: requester.phone,
        active: requester.active,
        departmentIds: requester.department_ids,
        createdAt: requester.created_at,
        updatedAt: requester.updated_at,
        customFields: requester.custom_fields
      },
      message:
        `Retrieved requester **#${requester.id}**: "${requester.first_name} ${requester.last_name || ''}"`.trim()
    };
  })
  .build();

export let listRequesters = SlateTool.create(spec, {
  name: 'List Requesters',
  key: 'list_requesters',
  description: `List requesters in Freshservice. Supports filtering via query language and pagination.`,
  instructions: [
    'Use the query parameter with Freshservice query syntax, e.g. "email:\'user@example.com\'" or "department_id:123".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Filter query (e.g. "email:\'user@example.com\'")'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max: 100)')
    })
  )
  .output(
    z.object({
      requesters: z.array(
        z.object({
          requesterId: z.number().describe('ID'),
          firstName: z.string().describe('First name'),
          lastName: z.string().nullable().describe('Last name'),
          email: z.string().nullable().describe('Primary email'),
          active: z.boolean().describe('Active status'),
          createdAt: z.string().describe('Creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.listRequesters(
      { page: ctx.input.page, perPage: ctx.input.perPage },
      ctx.input.query
    );

    let requesters = result.requesters.map((r: Record<string, unknown>) => ({
      requesterId: r.id as number,
      firstName: r.first_name as string,
      lastName: r.last_name as string | null,
      email: r.primary_email as string | null,
      active: r.active as boolean,
      createdAt: r.created_at as string
    }));

    return {
      output: { requesters },
      message: `Found **${requesters.length}** requesters`
    };
  })
  .build();

export let updateRequester = SlateTool.create(spec, {
  name: 'Update Requester',
  key: 'update_requester',
  description: `Update a requester's profile information.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      requesterId: z.number().describe('ID of the requester to update'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Primary email'),
      phone: z.string().optional().describe('Phone number'),
      departmentIds: z.array(z.number()).optional().describe('Department IDs'),
      customFields: z.record(z.string(), z.unknown()).optional().describe('Custom fields')
    })
  )
  .output(
    z.object({
      requesterId: z.number().describe('ID of the updated requester'),
      firstName: z.string().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      email: z.string().nullable().describe('Primary email'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let { requesterId, ...updateParams } = ctx.input;
    let requester = await client.updateRequester(requesterId, updateParams);

    return {
      output: {
        requesterId: requester.id,
        firstName: requester.first_name,
        lastName: requester.last_name,
        email: requester.primary_email,
        updatedAt: requester.updated_at
      },
      message: `Updated requester **#${requester.id}**`
    };
  })
  .build();
