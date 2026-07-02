import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUnsubscribes = SlateTool.create(spec, {
  name: 'List Unsubscribes',
  key: 'list_unsubscribes',
  description: `List email addresses that have been unsubscribed. Unsubscribed contacts will not receive sequences from any team member.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      unsubscribes: z
        .array(
          z.object({
            email: z.string().describe('Unsubscribed email address'),
            createdAt: z.string().optional().describe('When the unsubscribe was recorded')
          })
        )
        .describe('List of unsubscribed contacts'),
      nextCursor: z.string().optional().describe('Cursor for next page'),
      hasNext: z.boolean().optional().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listUnsubscribes({
      limit: ctx.input.limit,
      next: ctx.input.cursor
    });

    let results = data.results || data || [];
    let unsubscribes = results.map((u: any) => ({
      email: u.email,
      createdAt: u.createdAt
    }));

    return {
      output: {
        unsubscribes,
        nextCursor: data.next,
        hasNext: data.hasNext
      },
      message: `Found ${unsubscribes.length} unsubscribed address(es).`
    };
  })
  .build();

export let addUnsubscribe = SlateTool.create(spec, {
  name: 'Add Unsubscribe',
  key: 'add_unsubscribe',
  description: `Add an email address to the unsubscribe list. The address will be blocked from receiving sequences from all team members.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to unsubscribe')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the email was unsubscribed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.addUnsubscribe(ctx.input.email);

    return {
      output: { success: true },
      message: `${ctx.input.email} has been added to the unsubscribe list.`
    };
  })
  .build();

export let removeUnsubscribe = SlateTool.create(spec, {
  name: 'Remove Unsubscribe',
  key: 'remove_unsubscribe',
  description: `Remove an email address from the unsubscribe list, allowing them to receive sequences again.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to resubscribe')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the email was removed from the unsubscribe list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.removeUnsubscribe(ctx.input.email);

    return {
      output: { success: true },
      message: `${ctx.input.email} has been removed from the unsubscribe list.`
    };
  })
  .build();
