import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let editCustomer = SlateTool.create(spec, {
  name: 'Edit Customer',
  key: 'edit_customer',
  description: `Update an existing individual customer's profile. You can modify contact information, demographics, tags, custom fields, and other details. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('The customer ID to edit'),
      lookupBy: z
        .enum(['id', 'externalId'])
        .default('id')
        .describe('Whether to look up by internal ID or external ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      patronymic: z.string().optional().describe('Patronymic'),
      email: z.string().optional().describe('Email address'),
      phones: z
        .array(
          z.object({
            number: z.string().describe('Phone number')
          })
        )
        .optional()
        .describe('Phone numbers (replaces existing)'),
      sex: z.enum(['male', 'female']).optional().describe('Sex'),
      birthday: z.string().optional().describe('Birthday (YYYY-MM-DD)'),
      address: z
        .object({
          countryIso: z.string().optional(),
          region: z.string().optional(),
          city: z.string().optional(),
          street: z.string().optional(),
          building: z.string().optional(),
          flat: z.string().optional(),
          index: z.string().optional(),
          text: z.string().optional()
        })
        .optional()
        .describe('Customer address'),
      managerId: z.number().optional().describe('Assigned manager user ID'),
      vip: z.boolean().optional().describe('Mark as VIP'),
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
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Internal ID of the edited customer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let { customerId, lookupBy, ...customerData } = ctx.input;
    let result = await client.editCustomer(customerId, customerData, lookupBy);

    return {
      output: {
        customerId: result.customerId
      },
      message: `Updated customer **${result.customerId}**.`
    };
  })
  .build();
