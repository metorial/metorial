import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or upsert a contact in Freshsales.
Supports custom fields and social media profiles. Use **uniqueIdentifier** to upsert by email or other unique fields.`,
  instructions: [
    'To create a new contact, omit contactId and uniqueIdentifier.',
    'To update, provide contactId.',
    'To upsert by email, provide uniqueIdentifier like { "emails": "jane@example.com" }.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z
        .number()
        .optional()
        .describe('ID of the contact to update. Omit to create.'),
      uniqueIdentifier: z
        .record(z.string(), z.any())
        .optional()
        .describe('Unique identifier for upsert'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Primary email'),
      mobileNumber: z.string().optional().describe('Mobile phone number'),
      workNumber: z.string().optional().describe('Work phone number'),
      jobTitle: z.string().optional().describe('Job title'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      zipcode: z.string().optional().describe('Postal/zip code'),
      country: z.string().optional().describe('Country'),
      ownerId: z.number().optional().describe('Assigned user ID'),
      leadSourceId: z.number().optional().describe('Lead source ID'),
      contactStatusId: z.number().optional().describe('Contact status ID'),
      lifecycleStageId: z.number().optional().describe('Lifecycle stage ID'),
      territoryId: z.number().optional().describe('Territory ID'),
      facebook: z.string().optional().describe('Facebook username'),
      twitter: z.string().optional().describe('Twitter handle'),
      linkedin: z.string().optional().describe('LinkedIn profile URL'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the contact'),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      displayName: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      jobTitle: z.string().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let contactData: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) contactData.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) contactData.last_name = ctx.input.lastName;
    if (ctx.input.email !== undefined) contactData.email = ctx.input.email;
    if (ctx.input.mobileNumber !== undefined)
      contactData.mobile_number = ctx.input.mobileNumber;
    if (ctx.input.workNumber !== undefined) contactData.work_number = ctx.input.workNumber;
    if (ctx.input.jobTitle !== undefined) contactData.job_title = ctx.input.jobTitle;
    if (ctx.input.address !== undefined) contactData.address = ctx.input.address;
    if (ctx.input.city !== undefined) contactData.city = ctx.input.city;
    if (ctx.input.state !== undefined) contactData.state = ctx.input.state;
    if (ctx.input.zipcode !== undefined) contactData.zipcode = ctx.input.zipcode;
    if (ctx.input.country !== undefined) contactData.country = ctx.input.country;
    if (ctx.input.ownerId !== undefined) contactData.owner_id = ctx.input.ownerId;
    if (ctx.input.leadSourceId !== undefined)
      contactData.lead_source_id = ctx.input.leadSourceId;
    if (ctx.input.contactStatusId !== undefined)
      contactData.contact_status_id = ctx.input.contactStatusId;
    if (ctx.input.lifecycleStageId !== undefined)
      contactData.lifecycle_stage_id = ctx.input.lifecycleStageId;
    if (ctx.input.territoryId !== undefined) contactData.territory_id = ctx.input.territoryId;
    if (ctx.input.facebook !== undefined) contactData.facebook = ctx.input.facebook;
    if (ctx.input.twitter !== undefined) contactData.twitter = ctx.input.twitter;
    if (ctx.input.linkedin !== undefined) contactData.linkedin = ctx.input.linkedin;
    if (ctx.input.customFields) contactData.custom_field = ctx.input.customFields;

    let contact: Record<string, any>;
    let action: string;

    if (ctx.input.contactId) {
      contact = await client.updateContact(ctx.input.contactId, contactData);
      action = 'updated';
    } else if (ctx.input.uniqueIdentifier) {
      contact = await client.upsertContact(ctx.input.uniqueIdentifier, contactData);
      action = 'upserted';
    } else {
      contact = await client.createContact(contactData);
      action = 'created';
    }

    return {
      output: {
        contactId: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        displayName: contact.display_name,
        email: contact.email,
        jobTitle: contact.job_title,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      },
      message: `Contact **${contact.display_name || contact.first_name || contact.id}** ${action} successfully.`
    };
  })
  .build();
