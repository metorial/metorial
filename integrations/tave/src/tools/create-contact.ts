import { SlateTool } from 'slates';
import { z } from 'zod';
import { TavePublicClient } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Creates a new contact in the Tave address book. Contacts can represent individuals or businesses and can be associated with a specific brand. Requires the **API Key (Public API V2)** authentication method.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      contactKind: z
        .string()
        .optional()
        .describe('Kind of contact (e.g., "individual", "business")'),
      brand: z.string().optional().describe('Brand to associate the contact with'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the created contact'),
      firstName: z.string().describe('First name of the created contact'),
      lastName: z.string().optional().describe('Last name of the created contact'),
      email: z.string().optional().describe('Email of the created contact'),
      raw: z.any().optional().describe('Full contact record from API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TavePublicClient(ctx.auth.token);

    let data: Record<string, unknown> = {
      first_name: ctx.input.firstName
    };

    if (ctx.input.lastName) data.last_name = ctx.input.lastName;
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.phone) data.phone = ctx.input.phone;
    if (ctx.input.contactKind) data.contact_kind = ctx.input.contactKind;
    if (ctx.input.brand) data.brand = ctx.input.brand;

    if (ctx.input.customFields) {
      data.custom_fields = ctx.input.customFields;
    }

    ctx.info({ message: 'Creating contact in Tave', firstName: ctx.input.firstName });

    let result = await client.createContact(data);

    return {
      output: {
        contactId: String(result.id ?? result.contact_id ?? ''),
        firstName: result.first_name ?? ctx.input.firstName,
        lastName: result.last_name ?? ctx.input.lastName,
        email: result.email ?? ctx.input.email,
        raw: result
      },
      message: `Successfully created contact **${ctx.input.firstName}${ctx.input.lastName ? ` ${ctx.input.lastName}` : ''}**${ctx.input.email ? ` (${ctx.input.email})` : ''}.`
    };
  })
  .build();
