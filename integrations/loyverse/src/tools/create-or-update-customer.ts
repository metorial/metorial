import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pickWritable, requireForCreate } from '../lib/upsert';
import { spec } from '../spec';

let CUSTOMER_WRITABLE_KEYS = [
  'name',
  'email',
  'phone_number',
  'address',
  'city',
  'region',
  'postal_code',
  'country_code',
  'customer_code',
  'note',
  'total_points'
] as const;

export let createOrUpdateCustomer = SlateTool.create(spec, {
  name: 'Create or Update Customer',
  key: 'create_or_update_customer',
  description: `Create a new customer or update an existing one. If a **customerId** is provided, the customer is updated and fields you omit keep their current values; otherwise a new customer is created. Customers can be looked up by email using the List Customers tool before updating.`,
  instructions: ['customerName is required when creating a customer.']
})
  .input(
    z.object({
      customerId: z
        .string()
        .optional()
        .describe('Customer ID to update; omit to create a new customer'),
      customerName: z
        .string()
        .optional()
        .describe('Full name of the customer (required when creating, max 64 characters)'),
      email: z.string().optional().describe('Email address'),
      phoneNumber: z.string().optional().describe('Phone number (max 15 characters)'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      region: z.string().optional().describe('State or region'),
      postalCode: z.string().optional().describe('Postal/ZIP code'),
      countryCode: z
        .string()
        .optional()
        .describe('Two-letter ISO 3166-1 country code (e.g., US, GB)'),
      customerCode: z.string().optional().describe('Customer loyalty code'),
      note: z.string().optional().describe('Note about the customer'),
      totalPoints: z
        .number()
        .optional()
        .describe('Set the absolute loyalty points balance; replaces the current balance')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('ID of the created/updated customer'),
      customerName: z.string().nullable().optional().describe('Customer name'),
      email: z.string().nullable().optional().describe('Email address'),
      phoneNumber: z.string().nullable().optional().describe('Phone number'),
      totalPoints: z.number().nullable().optional().describe('Loyalty points balance'),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;
    let isUpdate = !!input.customerId;

    let body: any = {};
    if (isUpdate) {
      let existing = await client.getCustomer(input.customerId!);
      body = pickWritable(existing, CUSTOMER_WRITABLE_KEYS);
      body.id = input.customerId;
    } else {
      requireForCreate(input.customerName, 'customerName', 'customer');
    }

    if (input.customerName !== undefined) body.name = input.customerName;
    if (input.email !== undefined) body.email = input.email;
    if (input.phoneNumber !== undefined) body.phone_number = input.phoneNumber;
    if (input.address !== undefined) body.address = input.address;
    if (input.city !== undefined) body.city = input.city;
    if (input.region !== undefined) body.region = input.region;
    if (input.postalCode !== undefined) body.postal_code = input.postalCode;
    if (input.countryCode !== undefined) body.country_code = input.countryCode;
    if (input.customerCode !== undefined) body.customer_code = input.customerCode;
    if (input.note !== undefined) body.note = input.note;
    if (input.totalPoints !== undefined) body.total_points = input.totalPoints;

    let result = await client.createOrUpdateCustomer(body);

    return {
      output: {
        customerId: result.id,
        customerName: result.name,
        email: result.email,
        phoneNumber: result.phone_number,
        totalPoints: result.total_points,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `${isUpdate ? 'Updated' : 'Created'} customer **${result.name ?? result.id}**.`
    };
  })
  .build();
