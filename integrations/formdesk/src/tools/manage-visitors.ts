import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listVisitors = SlateTool.create(spec, {
  name: 'List Visitors',
  key: 'list_visitors',
  description: `Retrieves all form visitors (registered users who can log in to forms supporting entry maintenance). Optionally filter by a search query.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter visitors by name, email, or username')
    })
  )
  .output(
    z.object({
      visitors: z.array(
        z.object({
          visitorId: z.string().describe('Unique identifier of the visitor'),
          name: z.string().optional().describe('Full name of the visitor'),
          email: z.string().optional().describe('Email address of the visitor'),
          username: z.string().optional().describe('Username of the visitor')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Fetching visitors...');
    let visitors = await client.getVisitors(ctx.input.search);

    let mapped = visitors.map((v: any) => ({
      visitorId: String(v.id || ''),
      name: v.name || undefined,
      email: v.email || undefined,
      username: v.username || undefined
    }));

    return {
      output: { visitors: mapped },
      message: `Found **${mapped.length}** visitor(s).`
    };
  })
  .build();

export let addVisitor = SlateTool.create(spec, {
  name: 'Add Visitor',
  key: 'add_visitor',
  description: `Creates a new visitor account. Visitors are registered users who can log in to forms that support entry maintenance. A password is auto-generated if not provided.`
})
  .input(
    z.object({
      name: z.string().describe('Full name of the visitor'),
      email: z.string().describe('Email address of the visitor'),
      username: z
        .string()
        .optional()
        .describe('Username for the visitor (auto-generated if omitted)'),
      password: z
        .string()
        .optional()
        .describe('Password for the visitor (auto-generated if omitted)')
    })
  )
  .output(
    z.object({
      visitorId: z.string().describe('Unique identifier of the newly created visitor'),
      username: z.string().optional().describe('Username assigned to the visitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Creating visitor...');
    let result = await client.addVisitor({
      name: ctx.input.name,
      email: ctx.input.email,
      username: ctx.input.username,
      password: ctx.input.password
    });

    return {
      output: {
        visitorId: String(result?.id || result?.visitorId || ''),
        username: result?.username || undefined
      },
      message: `Successfully created visitor "${ctx.input.name}".`
    };
  })
  .build();

export let updateVisitor = SlateTool.create(spec, {
  name: 'Update Visitor',
  key: 'update_visitor',
  description: `Updates an existing visitor's information including name, email, username, and password. Only the provided fields are updated.`
})
  .input(
    z.object({
      visitorId: z.string().describe('The unique ID of the visitor to update'),
      name: z.string().optional().describe('New name for the visitor'),
      email: z.string().optional().describe('New email for the visitor'),
      username: z.string().optional().describe('New username for the visitor'),
      password: z.string().optional().describe('New password for the visitor')
    })
  )
  .output(
    z.object({
      visitorId: z.string().describe('The ID of the updated visitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Updating visitor...');
    await client.updateVisitor(ctx.input.visitorId, {
      name: ctx.input.name,
      email: ctx.input.email,
      username: ctx.input.username,
      password: ctx.input.password
    });

    return {
      output: {
        visitorId: ctx.input.visitorId
      },
      message: `Successfully updated visitor **${ctx.input.visitorId}**.`
    };
  })
  .build();

export let removeVisitor = SlateTool.create(spec, {
  name: 'Remove Visitor',
  key: 'remove_visitor',
  description: `Removes a visitor account from Formdesk.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      visitorId: z.string().describe('The unique ID of the visitor to remove')
    })
  )
  .output(
    z.object({
      visitorId: z.string().describe('The ID of the removed visitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Removing visitor...');
    await client.removeVisitor(ctx.input.visitorId);

    return {
      output: {
        visitorId: ctx.input.visitorId
      },
      message: `Successfully removed visitor **${ctx.input.visitorId}**.`
    };
  })
  .build();
