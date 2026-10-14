import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { contactKind, TavePublicClient, textField } from '../lib/client';
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
      name: z
        .string()
        .optional()
        .describe('Company or location name; required when creating those contact kinds'),
      lastName: z.string().optional().describe('Last name of the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      contactKind: z
        .string()
        .optional()
        .describe(
          'Contact kind: person, company, or location; individual and business are also accepted'
        ),
      brand: z
        .string()
        .optional()
        .describe('Exact brand name or ID. Call get_brands to discover brands'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom fields keyed by the configured field ID, exact name, or token')
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
    let client = new TavePublicClient(ctx.auth);
    let kind = contactKind(ctx.input.contactKind ?? 'person');
    if (kind === 'employee')
      throw createApiServiceError(
        'The public contact creation API supports person, company, and location contacts.'
      );
    if (kind !== 'person' && !ctx.input.name?.trim()) {
      throw createApiServiceError('Provide name when creating a company or location contact.');
    }
    let data: Record<string, unknown> = pickDefined({
      kind,
      email: ctx.input.email,
      brandId: ctx.input.brand
        ? await client.resolveNamedId('/brand', ctx.input.brand, 'Brand')
        : undefined,
      customFields: ctx.input.customFields
        ? await client.customFields(ctx.input.customFields, 'Contact')
        : undefined
    });
    if (kind === 'person') {
      data.firstName = ctx.input.firstName;
      if (ctx.input.lastName !== undefined) data.lastName = ctx.input.lastName;
      if (ctx.input.phone !== undefined) data.cellPhone = { formatted: ctx.input.phone };
    } else {
      data.name = ctx.input.name;
      if (kind === 'company') {
        data.primaryContactFirstName = ctx.input.firstName;
        if (ctx.input.lastName !== undefined) data.primaryContactLastName = ctx.input.lastName;
      }
      if (ctx.input.phone !== undefined) data.phone = { formatted: ctx.input.phone };
    }

    ctx.info({ message: 'Creating contact in Tave', firstName: ctx.input.firstName });

    let result = await client.createContact(data);

    return {
      output: {
        contactId: String(result.id),
        firstName:
          textField(result, 'firstName', 'primaryContactFirstName', 'first_name') ??
          ctx.input.firstName,
        lastName:
          textField(result, 'lastName', 'primaryContactLastName', 'last_name') ??
          ctx.input.lastName,
        email: textField(result, 'email') ?? ctx.input.email,
        raw: result
      },
      message: `Successfully created contact **${ctx.input.firstName}${ctx.input.lastName ? ` ${ctx.input.lastName}` : ''}**${ctx.input.email ? ` (${ctx.input.email})` : ''}.`
    };
  })
  .build();
