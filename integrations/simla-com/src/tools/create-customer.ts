import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new individual customer in Simla.com. Provide contact information, demographics, and custom fields. Returns the new customer's internal ID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      externalId: z
        .string()
        .optional()
        .describe('External ID for the customer (from your system)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      patronymic: z.string().optional().describe('Patronymic (middle name)'),
      email: z.string().optional().describe('Email address'),
      phones: z
        .array(
          z.object({
            number: z.string().describe('Phone number')
          })
        )
        .optional()
        .describe('Phone numbers'),
      sex: z.enum(['male', 'female']).optional().describe('Sex'),
      birthday: z.string().optional().describe('Birthday (YYYY-MM-DD)'),
      address: z
        .object({
          countryIso: z.string().optional().describe('Country ISO code'),
          region: z.string().optional(),
          city: z.string().optional(),
          street: z.string().optional(),
          building: z.string().optional(),
          flat: z.string().optional(),
          index: z.string().optional().describe('Postal code'),
          text: z.string().optional().describe('Full address text')
        })
        .optional()
        .describe('Customer address'),
      managerId: z.number().optional().describe('Assigned manager user ID'),
      vip: z.boolean().optional().describe('Mark as VIP customer'),
      bad: z.boolean().optional().describe('Mark as bad customer'),
      personalDiscount: z.number().optional().describe('Personal discount percentage'),
      tags: z
        .array(
          z.object({
            name: z.string().describe('Tag name')
          })
        )
        .optional()
        .describe('Customer tags'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values (key: field code, value: field value)'),
      contragent: z
        .object({
          contragentType: z.string().optional().describe('Contragent type'),
          legalName: z.string().optional(),
          INN: z.string().optional(),
          KPP: z.string().optional(),
          OGRN: z.string().optional()
        })
        .optional()
        .describe('Contragent (legal entity) details'),
      source: z
        .object({
          source: z.string().optional().describe('Traffic source'),
          medium: z.string().optional().describe('Traffic medium'),
          campaign: z.string().optional().describe('Campaign name')
        })
        .optional()
        .describe('Source attribution')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Internal ID of the newly created customer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let result = await client.createCustomer(ctx.input);

    return {
      output: {
        customerId: result.customerId
      },
      message: `Created customer with ID **${result.customerId}**.`
    };
  })
  .build();
