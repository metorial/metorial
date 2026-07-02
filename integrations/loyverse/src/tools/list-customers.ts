import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customerSchema = z.object({
  customerId: z.string().describe('Unique customer ID'),
  customerName: z.string().nullable().optional().describe('Full name'),
  email: z.string().nullable().optional().describe('Email address'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  address: z.string().nullable().optional().describe('Street address'),
  city: z.string().nullable().optional().describe('City'),
  region: z.string().nullable().optional().describe('State/region'),
  postalCode: z.string().nullable().optional().describe('Postal/ZIP code'),
  countryCode: z.string().nullable().optional().describe('Country code'),
  customerCode: z.string().nullable().optional().describe('Customer loyalty code'),
  note: z.string().nullable().optional().describe('Customer note'),
  totalMoneySpent: z.number().optional().describe('Total money spent'),
  totalPoints: z.number().optional().describe('Loyalty points balance'),
  permanentDeletionAt: z
    .string()
    .nullable()
    .optional()
    .describe('Scheduled permanent deletion timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deletedAt: z.string().nullable().optional().describe('Deletion timestamp')
});

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve customer records from Loyverse. Supports filtering by email, phone number, and date ranges for syncing customer data. Returns paginated results.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of customers to return (1-250, default 50)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      email: z.string().optional().describe('Filter by exact email address'),
      phoneNumber: z.string().optional().describe('Filter by exact phone number'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Filter customers created at or after this ISO 8601 timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Filter customers created at or before this ISO 8601 timestamp'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Filter customers updated at or after this ISO 8601 timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Filter customers updated at or before this ISO 8601 timestamp'),
      showDeleted: z.boolean().optional().describe('Include deleted customers')
    })
  )
  .output(
    z.object({
      customers: z.array(customerSchema).describe('List of customers'),
      cursor: z.string().nullable().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCustomers({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      email: ctx.input.email,
      phoneNumber: ctx.input.phoneNumber,
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      showDeleted: ctx.input.showDeleted
    });

    let customers = (result.customers ?? []).map((c: any) => ({
      customerId: c.id,
      customerName: c.name,
      email: c.email,
      phoneNumber: c.phone_number,
      address: c.address,
      city: c.city,
      region: c.region,
      postalCode: c.postal_code,
      countryCode: c.country_code,
      customerCode: c.customer_code,
      note: c.note,
      totalMoneySpent: c.total_money_spent,
      totalPoints: c.total_points,
      permanentDeletionAt: c.permanent_deletion_at,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      deletedAt: c.deleted_at
    }));

    return {
      output: { customers, cursor: result.cursor },
      message: `Retrieved **${customers.length}** customer(s).${result.cursor ? ' More available via cursor.' : ''}`
    };
  })
  .build();
