import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by ID from Freshsales. Optionally include related data like accounts, owner, tasks, appointments, notes, and deals.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to retrieve'),
      include: z
        .array(
          z.enum([
            'sales_accounts',
            'owner',
            'creater',
            'updater',
            'source',
            'tasks',
            'appointments',
            'notes',
            'deals',
            'territory'
          ])
        )
        .optional()
        .describe('Related data to include')
    })
  )
  .output(
    z.object({
      contactId: z.number(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      displayName: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      emails: z.array(z.any()).nullable().optional(),
      mobileNumber: z.string().nullable().optional(),
      workNumber: z.string().nullable().optional(),
      jobTitle: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      zipcode: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      leadScore: z.number().nullable().optional(),
      ownerId: z.number().nullable().optional(),
      salesAccounts: z.array(z.any()).nullable().optional(),
      facebook: z.string().nullable().optional(),
      twitter: z.string().nullable().optional(),
      linkedin: z.string().nullable().optional(),
      customFields: z.record(z.string(), z.any()).nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let includeStr = ctx.input.include?.join(',');
    let contact = await client.getContact(ctx.input.contactId, includeStr);

    return {
      output: {
        contactId: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        displayName: contact.display_name,
        email: contact.email,
        emails: contact.emails,
        mobileNumber: contact.mobile_number,
        workNumber: contact.work_number,
        jobTitle: contact.job_title,
        address: contact.address,
        city: contact.city,
        state: contact.state,
        zipcode: contact.zipcode,
        country: contact.country,
        leadScore: contact.lead_score,
        ownerId: contact.owner_id,
        salesAccounts: contact.sales_accounts,
        facebook: contact.facebook,
        twitter: contact.twitter,
        linkedin: contact.linkedin,
        customFields: contact.custom_field,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      },
      message: `Retrieved contact **${contact.display_name || contact.id}**.`
    };
  })
  .build();
