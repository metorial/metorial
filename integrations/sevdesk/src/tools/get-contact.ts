import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a specific contact by ID, including its addresses and communication ways (email, phone, etc.). Returns full contact details with embedded related data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      name: z.string().optional().describe('Display name'),
      familyName: z.string().optional().describe('Family/last name'),
      firstName: z.string().optional().describe('First name'),
      customerNumber: z.string().optional().describe('Customer number'),
      description: z.string().optional().describe('Description/notes'),
      vatNumber: z.string().optional().describe('VAT number'),
      gender: z.string().optional().describe('Gender'),
      academicTitle: z.string().optional().describe('Academic title'),
      categoryId: z.string().optional().describe('Category ID'),
      addresses: z
        .array(
          z.object({
            addressId: z.string().describe('Address ID'),
            street: z.string().optional(),
            zip: z.string().optional(),
            city: z.string().optional()
          })
        )
        .optional()
        .describe('Contact addresses'),
      communicationWays: z
        .array(
          z.object({
            communicationWayId: z.string().describe('Communication way ID'),
            type: z.string().optional().describe('Type (EMAIL, PHONE, etc.)'),
            value: z.string().optional().describe('Value')
          })
        )
        .optional()
        .describe('Communication ways'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let contact = await client.getContact(ctx.input.contactId, {
      embed: 'addresses,communicationWays'
    });

    let addresses = (contact.addresses ?? []).map((a: any) => ({
      addressId: String(a.id),
      street: a.street ?? undefined,
      zip: a.zip ?? undefined,
      city: a.city ?? undefined
    }));

    let communicationWays = (contact.communicationWays ?? []).map((cw: any) => ({
      communicationWayId: String(cw.id),
      type: cw.type ?? undefined,
      value: cw.value ?? undefined
    }));

    let displayName =
      contact.name || [contact.surename, contact.familyname].filter(Boolean).join(' ') || '';

    return {
      output: {
        contactId: String(contact.id),
        name: displayName || undefined,
        familyName: contact.familyname ?? undefined,
        firstName: contact.surename ?? undefined,
        customerNumber: contact.customerNumber ?? undefined,
        description: contact.description ?? undefined,
        vatNumber: contact.vatNumber ?? undefined,
        gender: contact.gender ?? undefined,
        academicTitle: contact.academicTitle ?? undefined,
        categoryId: contact.category?.id ? String(contact.category.id) : undefined,
        addresses: addresses.length ? addresses : undefined,
        communicationWays: communicationWays.length ? communicationWays : undefined,
        createdAt: contact.create ?? undefined,
        updatedAt: contact.update ?? undefined
      },
      message: `Retrieved contact **${displayName}** (ID: ${contact.id}).`
    };
  })
  .build();
