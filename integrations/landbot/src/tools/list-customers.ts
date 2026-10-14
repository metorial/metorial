import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlatformClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomersTool = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve a paginated list of customers (end-users) from your Landbot account. Use **offset** and **limit** to paginate through results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Number of records to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of records to return (0 to 100)'),
      channelId: z.number().optional().describe('Filter by channel ID from list_channels'),
      agentId: z.number().optional().describe('Filter by assigned agent ID'),
      searchBy: z
        .enum(['name', 'email', 'phone'])
        .optional()
        .describe('Customer field to search'),
      search: z
        .string()
        .optional()
        .describe('Prefix to match against the selected customer field'),
      archived: z.boolean().optional().describe('Filter by archive status'),
      optIn: z.boolean().optional().describe('Filter by WhatsApp opt-in status')
    })
  )
  .output(
    z.object({
      customers: z.array(z.record(z.string(), z.any())).describe('List of customer records'),
      count: z.number().optional().describe('Total number of customers available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);

    let result = await client.listCustomers({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      channel_id: ctx.input.channelId,
      agent_id: ctx.input.agentId,
      search_by: ctx.input.searchBy,
      search: ctx.input.search,
      archived: ctx.input.archived,
      opt_in: ctx.input.optIn
    });

    let customers =
      result.results ?? result.customers ?? (Array.isArray(result) ? result : []);
    let count = result.total ?? result.count ?? customers.length;

    return {
      output: {
        customers,
        count
      },
      message: `Retrieved **${customers.length}** customers${count ? ` out of ${count} total` : ''}.`
    };
  });
