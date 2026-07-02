import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact by their Omnisend contact ID. Only the provided fields will be modified; other fields remain unchanged. Can update personal info, subscription statuses, tags, and custom properties.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      contactId: z.string().describe('Omnisend contact ID to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      address: z.string().optional().describe('Updated street address'),
      city: z.string().optional().describe('Updated city'),
      state: z.string().optional().describe('Updated state'),
      postalCode: z.string().optional().describe('Updated postal code'),
      country: z.string().optional().describe('Updated country'),
      countryCode: z.string().optional().describe('Updated ISO country code'),
      birthdate: z.string().optional().describe('Updated birthdate (YYYY-MM-DD)'),
      gender: z.enum(['m', 'f']).optional().describe('Updated gender'),
      tags: z.array(z.string()).optional().describe('Updated tags (replaces existing)'),
      customProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated custom properties'),
      identifiers: z
        .array(
          z.object({
            type: z.enum(['email', 'phone']).describe('Identifier type'),
            id: z.string().describe('Email or phone value'),
            channels: z
              .object({
                email: z
                  .object({
                    status: z.enum(['subscribed', 'nonSubscribed', 'unsubscribed']),
                    statusDate: z.string().optional()
                  })
                  .optional(),
                sms: z
                  .object({
                    status: z.enum(['subscribed', 'nonSubscribed', 'unsubscribed']),
                    statusDate: z.string().optional()
                  })
                  .optional()
              })
              .optional()
          })
        )
        .optional()
        .describe('Updated identifiers with channel statuses')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Omnisend contact ID'),
      email: z.string().optional().describe('Contact email'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth.token);

    let updates: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) updates.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) updates.lastName = ctx.input.lastName;
    if (ctx.input.address !== undefined) updates.address = ctx.input.address;
    if (ctx.input.city !== undefined) updates.city = ctx.input.city;
    if (ctx.input.state !== undefined) updates.state = ctx.input.state;
    if (ctx.input.postalCode !== undefined) updates.postalCode = ctx.input.postalCode;
    if (ctx.input.country !== undefined) updates.country = ctx.input.country;
    if (ctx.input.countryCode !== undefined) updates.countryCode = ctx.input.countryCode;
    if (ctx.input.birthdate !== undefined) updates.birthdate = ctx.input.birthdate;
    if (ctx.input.gender !== undefined) updates.gender = ctx.input.gender;
    if (ctx.input.tags !== undefined) updates.tags = ctx.input.tags;
    if (ctx.input.customProperties !== undefined)
      updates.customProperties = ctx.input.customProperties;
    if (ctx.input.identifiers !== undefined) updates.identifiers = ctx.input.identifiers;

    let result = await client.updateContact(ctx.input.contactId, updates);

    return {
      output: {
        contactId: result.contactID,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        updatedAt: result.updatedAt
      },
      message: `Updated contact **${result.email || ctx.input.contactId}**.`
    };
  })
  .build();
