import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact by their Omnisend contact ID. Only the provided fields will be modified; other fields remain unchanged. Can update personal info, subscription statuses, tags, and custom properties.`,
  tags: { destructive: true, readOnly: false }
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
      tags: z
        .array(z.string())
        .optional()
        .describe(
          'Contact tags: v5 appends; 2026-03-15 replaces the entire set and an empty array clears it'
        ),
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
    let client = new OmnisendClient(ctx.auth, ctx.config.apiVersion);
    let { contactId, ...updates } = ctx.input;
    let output = await client.updateContact(contactId, updates);
    return {
      output,
      message: 'Contact updated. Subscription and tag changes can affect automations.'
    };
  })
  .build();
