import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubscriber = SlateTool.create(spec, {
  name: 'Manage Subscriber',
  key: 'manage_subscriber',
  description: `List, create, update, or delete newsletter subscribers. Subscribers are email addresses registered to receive store newsletters.`,
  instructions: [
    'Use action "list" to retrieve subscribers with optional filtering.',
    'Use action "create" to add a new subscriber.',
    'Use action "update" to modify an existing subscriber.',
    'Use action "delete" to remove a subscriber.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      subscriberId: z
        .number()
        .optional()
        .describe('Subscriber ID (required for update/delete)'),
      email: z.string().optional().describe('Subscriber email address (required for create)'),
      firstName: z.string().optional().describe('Subscriber first name'),
      lastName: z.string().optional().describe('Subscriber last name'),
      source: z.string().optional().describe('Source of subscription'),
      orderId: z.number().optional().describe('Associated order ID'),
      page: z.number().optional().describe('Page number for list pagination'),
      limit: z.number().optional().describe('Results per page for list')
    })
  )
  .output(
    z.object({
      subscriber: z.any().optional().describe('The subscriber object'),
      subscribers: z.array(z.any()).optional().describe('List of subscribers'),
      deleted: z.boolean().optional().describe('Whether the subscriber was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    if (ctx.input.action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.email) params.email = ctx.input.email;
      if (ctx.input.page) params.page = ctx.input.page;
      if (ctx.input.limit) params.limit = ctx.input.limit;
      let result = await client.listSubscribers(params);
      return {
        output: { subscribers: result.data },
        message: `Found ${result.data.length} subscribers.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.subscriberId) throw new Error('subscriberId is required for delete');
      await client.deleteSubscriber(ctx.input.subscriberId);
      return {
        output: { deleted: true },
        message: `Deleted subscriber with ID ${ctx.input.subscriberId}.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.firstName) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName) data.last_name = ctx.input.lastName;
    if (ctx.input.source) data.source = ctx.input.source;
    if (ctx.input.orderId) data.order_id = ctx.input.orderId;

    if (ctx.input.action === 'create') {
      let result = await client.createSubscriber(data);
      return {
        output: { subscriber: result.data },
        message: `Created subscriber **${result.data.email}** (ID: ${result.data.id}).`
      };
    }

    if (!ctx.input.subscriberId) throw new Error('subscriberId is required for update');
    let result = await client.updateSubscriber(ctx.input.subscriberId, data);
    return {
      output: { subscriber: result.data },
      message: `Updated subscriber **${result.data.email}** (ID: ${result.data.id}).`
    };
  })
  .build();
