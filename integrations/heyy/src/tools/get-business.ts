import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBusinessTool = SlateTool.create(spec, {
  name: 'Get Business Info',
  key: 'get_business_info',
  description: `Retrieve details about your Heyy business account. Returns the business name, email, phone number, address, and other account-level configuration. Useful for verifying API connectivity and fetching business metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      businessId: z.string().describe('Unique identifier of the business'),
      name: z.string().describe('Name of the business'),
      email: z.string().nullable().optional().describe('Business email address'),
      phoneNumber: z.string().nullable().optional().describe('Business phone number'),
      address: z.string().nullable().optional().describe('Business address'),
      createdAt: z.string().optional().describe('When the business was created'),
      updatedAt: z.string().optional().describe('When the business was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let business = await client.getBusiness();

    return {
      output: {
        businessId: business.id,
        name: business.name,
        email: business.email ?? null,
        phoneNumber: business.phoneNumber ?? null,
        address: business.address ?? null,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt
      },
      message: `Retrieved business info for **${business.name}**.`
    };
  })
  .build();
