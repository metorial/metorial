import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let manageCustomerTool = SlateTool.create(spec, {
  name: 'Manage Customer',
  key: 'manage_customer',
  description: `Create customer accounts, list customers for a service desk, or add/remove customers from a service desk. Customers are the end-users who submit requests through the service desk portal.`,
  instructions: [
    'Use action "create" to create a new customer account.',
    'Use action "list" to list customers for a service desk.',
    'Use action "add" or "remove" to manage which customers have access to a service desk.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'add', 'remove']).describe('Action to perform'),
      serviceDeskId: z
        .string()
        .optional()
        .describe('Service desk ID (required for list, add, remove)'),
      email: z
        .string()
        .optional()
        .describe('Email for the new customer (required for create)'),
      displayName: z
        .string()
        .optional()
        .describe('Display name for the new customer (required for create)'),
      accountIds: z
        .array(z.string())
        .optional()
        .describe('Account IDs to add or remove (required for add, remove)'),
      query: z.string().optional().describe('Search query to filter customers (for list)'),
      start: z.number().optional().describe('Pagination start index'),
      limit: z.number().optional().describe('Pagination limit')
    })
  )
  .output(
    z.object({
      customer: z
        .object({
          accountId: z.string().describe('Account ID of the customer'),
          displayName: z.string().optional().describe('Display name'),
          emailAddress: z.string().optional().describe('Email address')
        })
        .optional()
        .describe('Created customer details'),
      customers: z
        .array(
          z.object({
            accountId: z.string().describe('Account ID'),
            displayName: z.string().optional().describe('Display name'),
            emailAddress: z.string().optional().describe('Email address')
          })
        )
        .optional()
        .describe('List of customers'),
      updated: z.boolean().optional().describe('Whether the customer list was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.email) throw new Error('email is required for create action');
      if (!ctx.input.displayName) throw new Error('displayName is required for create action');

      let result = await client.createCustomer(ctx.input.email, ctx.input.displayName);

      return {
        output: {
          customer: {
            accountId: result.accountId,
            displayName: result.displayName,
            emailAddress: result.emailAddress
          }
        },
        message: `Created customer "${result.displayName}" (${result.emailAddress}).`
      };
    }

    if (action === 'list') {
      if (!ctx.input.serviceDeskId)
        throw new Error('serviceDeskId is required for list action');

      let result = await client.getServiceDeskCustomers(
        ctx.input.serviceDeskId,
        ctx.input.query,
        ctx.input.start,
        ctx.input.limit
      );

      let customers = (result.values || []).map((c: any) => ({
        accountId: c.accountId,
        displayName: c.displayName,
        emailAddress: c.emailAddress
      }));

      return {
        output: { customers },
        message: `Found **${customers.length}** customers for service desk ${ctx.input.serviceDeskId}.`
      };
    }

    if (action === 'add') {
      if (!ctx.input.serviceDeskId) throw new Error('serviceDeskId is required');
      if (!ctx.input.accountIds?.length) throw new Error('accountIds are required');

      await client.addCustomersToServiceDesk(ctx.input.serviceDeskId, ctx.input.accountIds);

      return {
        output: { updated: true },
        message: `Added **${ctx.input.accountIds.length}** customers to service desk ${ctx.input.serviceDeskId}.`
      };
    }

    if (action === 'remove') {
      if (!ctx.input.serviceDeskId) throw new Error('serviceDeskId is required');
      if (!ctx.input.accountIds?.length) throw new Error('accountIds are required');

      await client.removeCustomersFromServiceDesk(
        ctx.input.serviceDeskId,
        ctx.input.accountIds
      );

      return {
        output: { updated: true },
        message: `Removed **${ctx.input.accountIds.length}** customers from service desk ${ctx.input.serviceDeskId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
