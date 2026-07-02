import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new personal or commercial customer record in AgencyZoom. Provide contact details, address, business information (for commercial customers), tags, and custom fields. Returns the newly created customer record.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('Customer first name'),
      lastName: z.string().describe('Customer last name'),
      email: z.string().optional().describe('Customer primary email address'),
      phone: z.string().optional().describe('Customer primary phone number'),
      address: z
        .object({
          street: z.string().optional().describe('Street address line'),
          city: z.string().optional().describe('City name'),
          state: z.string().optional().describe('State or province code'),
          zip: z.string().optional().describe('ZIP or postal code'),
          country: z.string().optional().describe('Country name or code')
        })
        .optional()
        .describe('Customer mailing address'),
      type: z
        .enum(['personal', 'commercial'])
        .optional()
        .describe('Customer type (defaults to personal if not specified)'),
      companyName: z
        .string()
        .optional()
        .describe('Company name (typically used for commercial customers)'),
      fein: z
        .string()
        .optional()
        .describe('Federal Employer Identification Number for commercial customers'),
      businessEntity: z
        .string()
        .optional()
        .describe('Business entity type (e.g. LLC, Corporation, Partnership)'),
      classification: z
        .string()
        .optional()
        .describe('Business classification or industry code'),
      employeeCount: z
        .number()
        .optional()
        .describe('Number of employees for commercial customers'),
      annualRevenue: z
        .number()
        .optional()
        .describe('Annual revenue in dollars for commercial customers'),
      payroll: z
        .number()
        .optional()
        .describe('Annual payroll amount in dollars for commercial customers'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Array of tag names to assign to the customer'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value pairs of custom field names and their values')
    })
  )
  .output(
    z.object({
      customer: z
        .record(z.string(), z.any())
        .describe('The newly created customer record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let data: Record<string, any> = {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName
    };

    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.phone !== undefined) data.phone = ctx.input.phone;
    if (ctx.input.address !== undefined) data.address = ctx.input.address;
    if (ctx.input.type !== undefined) data.type = ctx.input.type;
    if (ctx.input.companyName !== undefined) data.companyName = ctx.input.companyName;
    if (ctx.input.fein !== undefined) data.fein = ctx.input.fein;
    if (ctx.input.businessEntity !== undefined) data.businessEntity = ctx.input.businessEntity;
    if (ctx.input.classification !== undefined) data.classification = ctx.input.classification;
    if (ctx.input.employeeCount !== undefined) data.employeeCount = ctx.input.employeeCount;
    if (ctx.input.annualRevenue !== undefined) data.annualRevenue = ctx.input.annualRevenue;
    if (ctx.input.payroll !== undefined) data.payroll = ctx.input.payroll;
    if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;
    if (ctx.input.customFields !== undefined) data.customFields = ctx.input.customFields;

    let customer = await client.createCustomer(data);

    let customerName =
      `${customer.firstName || ctx.input.firstName} ${customer.lastName || ctx.input.lastName}`.trim();
    let customerId = customer.customerId || customer.id || '';

    return {
      output: { customer },
      message: `Created ${ctx.input.type || 'personal'} customer **${customerName}**${customerId ? ` (ID: ${customerId})` : ''}.`
    };
  })
  .build();
