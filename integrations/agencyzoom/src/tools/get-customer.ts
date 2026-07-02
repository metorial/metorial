import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve detailed information about a specific customer by ID. Optionally include the customer's policies and tasks in a single request. Returns the full customer record with all available fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Unique identifier of the customer to retrieve'),
      includePolicies: z
        .boolean()
        .optional()
        .describe("Whether to include the customer's policies in the response"),
      includeTasks: z
        .boolean()
        .optional()
        .describe("Whether to include the customer's tasks in the response")
    })
  )
  .output(
    z.object({
      customer: z
        .record(z.string(), z.any())
        .describe('Full customer record with all available fields'),
      policies: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Array of policies associated with the customer (included when includePolicies is true)'
        ),
      tasks: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Array of tasks associated with the customer (included when includeTasks is true)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let customer = await client.getCustomer(ctx.input.customerId);

    let policies: Record<string, any>[] | undefined;
    let tasks: Record<string, any>[] | undefined;
    let extras: string[] = [];

    if (ctx.input.includePolicies) {
      let policiesResult = await client.getCustomerPolicies(ctx.input.customerId);
      let raw = policiesResult.policies || policiesResult.data || policiesResult || [];
      policies = Array.isArray(raw) ? raw : [];
      extras.push(`${policies.length} policy/policies`);
    }

    if (ctx.input.includeTasks) {
      let tasksResult = await client.getCustomerTasks(ctx.input.customerId);
      let raw = tasksResult.tasks || tasksResult.data || tasksResult || [];
      tasks = Array.isArray(raw) ? raw : [];
      extras.push(`${tasks.length} task(s)`);
    }

    let customerName =
      `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || ctx.input.customerId;
    let extrasMsg = extras.length > 0 ? ` Including ${extras.join(' and ')}.` : '';

    return {
      output: {
        customer,
        policies,
        tasks
      },
      message: `Retrieved customer **${customerName}**.${extrasMsg}`
    };
  })
  .build();
