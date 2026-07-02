import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or look up contacts in Simplero. Supports creating new contacts, updating existing ones by email, finding contacts by email/ID/token, and managing GDPR consent, tags, notes, and custom fields.
Use **override** to replace existing values rather than merging. Tags added here are additive; use the dedicated tag management tool to remove tags.`,
  instructions: [
    'Provide email to create or update a contact. Use contactId or contactToken to find existing contacts.',
    'Custom fields use the internal naming convention field_ID_SUBFIELD (e.g., field_123_city).',
    'Tags provided during create/update are additive only. Use the Tag Contact tool to remove tags.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create_or_update', 'find', 'list']).describe('Action to perform'),
      email: z.string().optional().describe('Contact email address'),
      contactId: z.string().optional().describe('Simplero internal contact ID'),
      contactToken: z.string().optional().describe('Simplero contact token'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.string().optional().describe('Phone number'),
      tags: z.array(z.string()).optional().describe('Tags to add to the contact'),
      note: z.string().optional().describe('Note to add to the contact'),
      gdprConsent: z.boolean().optional().describe('Whether GDPR consent is given'),
      gdprConsentText: z.string().optional().describe('Text of the GDPR consent'),
      override: z
        .boolean()
        .optional()
        .describe('Set to true to replace existing values instead of merging'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Custom fields as key-value pairs using internal names (e.g., field_123_city)'
        ),
      ipAddress: z.string().optional().describe('IP address of the contact'),
      referrer: z.string().optional().describe('Referrer URL'),
      affiliateRef: z.string().optional().describe('Affiliate reference'),
      landingPageId: z.number().optional().describe('Landing page ID'),
      page: z.number().optional().describe('Page number for listing (0-indexed)'),
      perPage: z.number().optional().describe('Results per page for listing (1-100)'),
      tagId: z.number().optional().describe('Filter contacts by tag ID when listing'),
      from: z
        .string()
        .optional()
        .describe('Filter contacts created from this date (ISO 8601)'),
      to: z.string().optional().describe('Filter contacts created to this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.unknown()).optional().describe('Contact record'),
      contacts: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of contact records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });

    if (ctx.input.action === 'list') {
      let contacts = await client.listContacts({
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        from: ctx.input.from,
        to: ctx.input.to,
        tagId: ctx.input.tagId
      });
      return {
        output: { contacts },
        message: `Found **${contacts.length}** contact(s).`
      };
    }

    if (ctx.input.action === 'find') {
      let contact = await client.findContact({
        email: ctx.input.email,
        contactId: ctx.input.contactId,
        contactToken: ctx.input.contactToken
      });
      let name = `${contact.first_name || ''} ${contact.last_name || ''}`;
      return {
        output: { contact },
        message: `Found contact **${name.trim() || contact.email}** (ID: ${contact.id}).`
      };
    }

    if (!ctx.input.email) {
      throw new Error('Email is required to create or update a contact.');
    }

    let contact = await client.createOrUpdateContact({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      phone: ctx.input.phone,
      tags: ctx.input.tags,
      note: ctx.input.note,
      gdprConsent: ctx.input.gdprConsent,
      gdprConsentText: ctx.input.gdprConsentText,
      override: ctx.input.override,
      customFields: ctx.input.customFields,
      ipAddress: ctx.input.ipAddress,
      referrer: ctx.input.referrer,
      ref: ctx.input.affiliateRef,
      landingPageId: ctx.input.landingPageId
    });

    let name = `${contact.first_name || ''} ${contact.last_name || ''}`;
    return {
      output: { contact },
      message: `Contact **${name.trim() || contact.email}** (ID: ${contact.id}) created/updated successfully.`
    };
  })
  .build();
