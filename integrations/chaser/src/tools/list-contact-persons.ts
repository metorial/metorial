import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactPersonOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listContactPersons = SlateTool.create(spec, {
  name: 'List Contact Persons',
  key: 'list_contact_persons',
  description: `List all contact persons for a given customer. Returns contact details including name, email, phone, and status for each contact person associated with the customer.`,
  instructions: ['The customerId can be an internal Chaser ID or "ext_{externalId}".'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Internal Chaser customer ID or "ext_{externalId}"'),
      page: z.number().optional().default(0).describe('Page number (starts at 0)'),
      limit: z.number().optional().default(100).describe('Results per page (max 100)')
    })
  )
  .output(
    z.object({
      pageNumber: z.number().describe('Current page number'),
      pageSize: z.number().describe('Results per page'),
      totalCount: z.number().describe('Total contact persons'),
      contactPersons: z.array(contactPersonOutputSchema).describe('List of contact persons')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContactPersons(ctx.input.customerId, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let contactPersons = result.data.map((c: any) => ({
      externalId: c.externalId || '',
      contactFirstName: c.contactFirstName ?? null,
      contactLastName: c.contactLastName ?? null,
      contactEmailAddress: c.contactEmailAddress ?? null,
      phoneNumber: c.phoneNumber ?? null,
      mobileNumber: c.mobileNumber ?? null,
      status: c.status
    }));

    return {
      output: {
        pageNumber: result.pageNumber,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        contactPersons
      },
      message: `Found **${result.totalCount}** contact persons for customer ${ctx.input.customerId}.`
    };
  })
  .build();
