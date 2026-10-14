import { SlateTool } from 'slates';
import { z } from 'zod';
import { AscoraClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Searches a page of customers from Ascora. Returns customer records including contact details and company information.

Use this to look up existing customers, sync customer data to external systems, or verify customer records.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerType: z.string().optional().describe('Customer type name'),
      leadSource: z.string().optional().describe('Lead source name'),
      assignedUser: z.string().optional().describe('Full name of the assigned user'),
      siteBillingType: z.enum(['Site', 'Billing', 'All']).optional().describe('Customer role'),
      filterText: z
        .string()
        .optional()
        .describe('Search customer numbers and contact details'),
      phoneNumber: z.string().optional().describe('Search phone and mobile numbers'),
      page: z.number().int().min(1).optional().describe('Page number to retrieve'),
      pageSize: z.number().int().min(1).optional().describe('Number of records per page')
    })
  )
  .output(
    z.object({
      customers: z.array(z.any()).describe('List of customer records from Ascora'),
      count: z.number().describe('Number of customers returned in this page'),
      totalPages: z.number().optional().describe('Total result pages reported by Ascora'),
      totalRecords: z
        .number()
        .optional()
        .describe('Total matching customers reported by Ascora')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AscoraClient(ctx.auth);

    let result = await client.listCustomers(ctx.input);

    return {
      output: {
        ...result,
        count: result.customers.length
      },
      message: `Retrieved **${result.customers.length}** customer(s) from Ascora.`
    };
  })
  .build();
