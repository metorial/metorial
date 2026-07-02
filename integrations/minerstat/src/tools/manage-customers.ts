import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let manageCustomersTool = SlateTool.create(spec, {
  name: 'Manage Customers',
  key: 'manage_customers',
  description: `List, create, update, or delete customer (sub-account) records. Customers represent sub-accounts that can have their own workers, tags, and configurations. When listing, you can request specific fields like created, accessKey, name, email, packageName, packageWorkers, and packageExpiry.`,
  constraints: ['Requires a Bearer token (private API)'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      customerId: z
        .number()
        .optional()
        .describe('Customer ID to target (for get/update/delete)'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated fields to include when listing (e.g. "name,email,accessKey,packageName")'
        ),
      customerData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Customer data for create or update operations')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      response: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.token) {
      throw new Error(
        'Bearer token is required for customer management. Use the "API Credentials" authentication method.'
      );
    }

    let client = new ManagementClient({ token: ctx.auth.token });
    let result: any;

    switch (ctx.input.action) {
      case 'list': {
        ctx.progress('Fetching customers...');
        result = await client.getCustomers({
          user: ctx.input.customerId,
          fields: ctx.input.fields
        });
        break;
      }
      case 'create': {
        ctx.progress('Creating customer...');
        result = await client.createCustomer(ctx.input.customerData ?? {});
        break;
      }
      case 'update': {
        ctx.progress('Updating customer...');
        result = await client.updateCustomer({
          user: ctx.input.customerId,
          ...(ctx.input.customerData ?? {})
        });
        break;
      }
      case 'delete': {
        if (!ctx.input.customerId) {
          throw new Error('customerId is required to delete a customer.');
        }
        ctx.progress(`Deleting customer ${ctx.input.customerId}...`);
        result = await client.deleteCustomer({ user: ctx.input.customerId });
        break;
      }
    }

    return {
      output: {
        success: true,
        response: result
      },
      message: `Customer operation **${ctx.input.action}** completed successfully${ctx.input.customerId ? ` for customer **${ctx.input.customerId}**` : ''}.`
    };
  })
  .build();
