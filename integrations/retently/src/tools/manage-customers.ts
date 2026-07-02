import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customerPropertySchema = z.object({
  label: z.string().describe('Property label/name'),
  type: z
    .enum(['string', 'date', 'integer', 'collection', 'boolean'])
    .describe('Property data type'),
  value: z.union([z.string(), z.number(), z.boolean()]).describe('Property value')
});

let customerInputSchema = z.object({
  email: z.string().describe('Customer email address (used as unique identifier)'),
  firstName: z.string().optional().describe('Customer first name'),
  lastName: z.string().optional().describe('Customer last name'),
  company: z.string().optional().describe('Company name'),
  tags: z.array(z.string()).optional().describe('Tags to assign to the customer'),
  properties: z
    .array(customerPropertySchema)
    .optional()
    .describe('Custom properties to set on the customer')
});

let normalizeProperties = (
  properties?: Array<{
    label: string;
    type: 'string' | 'date' | 'integer' | 'collection' | 'boolean';
    value?: string | number | boolean;
  }>
) => {
  if (!properties) return undefined;
  let normalized = properties
    .filter(p => p.value !== undefined)
    .map(p => ({
      label: p.label,
      type: p.type,
      value: p.value as string | number | boolean
    }));
  return normalized.length > 0 ? normalized : undefined;
};

export let manageCustomers = SlateTool.create(spec, {
  name: 'Manage Customers',
  key: 'manage_customers',
  description: `Create, update, or delete customers in Retently. Customers are identified by email address.
When creating or updating, existing customers matched by email will have their data merged (existing properties not included in the request are preserved).
Supports bulk operations for up to 1,000 customers per request.`,
  constraints: [
    'Maximum 1,000 customers per create/update request',
    'Customers are matched by email address'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create_or_update', 'delete']).describe('Action to perform'),
      customers: z
        .array(customerInputSchema)
        .min(1)
        .describe('List of customers to create, update, or delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      result: z.any().optional().describe('Response data from Retently')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.action === 'create_or_update') {
      let subscribers = ctx.input.customers.map(c => ({
        email: c.email,
        first_name: c.firstName,
        last_name: c.lastName,
        company: c.company,
        tags: c.tags,
        properties: normalizeProperties(c.properties)
      }));

      let result = await client.createOrUpdateCustomers(subscribers);
      let count = ctx.input.customers.length;
      return {
        output: { success: true, result },
        message: `Successfully created/updated **${count}** customer(s).`
      };
    } else {
      let emails = ctx.input.customers.map(c => c.email);
      let result = await client.deleteCustomers(emails);
      return {
        output: { success: true, result },
        message: `Successfully deleted **${emails.length}** customer(s).`
      };
    }
  })
  .build();
