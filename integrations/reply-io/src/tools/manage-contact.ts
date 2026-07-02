import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customFieldSchema = z.object({
  key: z.string().describe('Custom field key'),
  value: z.string().describe('Custom field value')
});

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or delete a contact. Can also search for a contact by email. Supports all standard fields plus custom fields.`,
  instructions: [
    'To create a contact, set action to "create" and provide at least "firstName".',
    'To update, set action to "update" and provide the "contactId" plus any fields to change.',
    'To delete, set action to "delete" and provide the "contactId".',
    'To search by email, set action to "search" and provide "email".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'search']).describe('Action to perform'),
      contactId: z.number().optional().describe('Contact ID (required for update/delete)'),
      firstName: z.string().optional().describe('First name (required for create)'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      title: z.string().optional().describe('Job title'),
      company: z.string().optional().describe('Company name'),
      companySize: z.string().optional().describe('Company size'),
      industry: z.string().optional().describe('Industry'),
      linkedInProfile: z.string().optional().describe('LinkedIn profile URL'),
      linkedInSalesNavigator: z.string().optional().describe('LinkedIn Sales Navigator URL'),
      linkedInRecruiter: z.string().optional().describe('LinkedIn Recruiter URL'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      country: z.string().optional().describe('Country'),
      timeZone: z.string().optional().describe('Time zone'),
      notes: z.string().optional().describe('Notes about the contact'),
      customFields: z.array(customFieldSchema).optional().describe('Custom fields')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.any()).optional().describe('Contact details'),
      contacts: z.array(z.record(z.string(), z.any())).optional().describe('Search results'),
      deleted: z.boolean().optional().describe('Whether the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      action,
      contactId,
      firstName,
      lastName,
      email,
      phone,
      title,
      company,
      companySize,
      industry,
      linkedInProfile,
      linkedInSalesNavigator,
      linkedInRecruiter,
      city,
      state,
      country,
      timeZone,
      notes,
      customFields
    } = ctx.input;

    let buildData = () => {
      let data: Record<string, any> = {};
      if (firstName !== undefined) data.firstName = firstName;
      if (lastName !== undefined) data.lastName = lastName;
      if (email !== undefined) data.email = email;
      if (phone !== undefined) data.phone = phone;
      if (title !== undefined) data.title = title;
      if (company !== undefined) data.company = company;
      if (companySize !== undefined) data.companySize = companySize;
      if (industry !== undefined) data.industry = industry;
      if (linkedInProfile !== undefined) data.linkedInProfile = linkedInProfile;
      if (linkedInSalesNavigator !== undefined)
        data.linkedInSalesNavigator = linkedInSalesNavigator;
      if (linkedInRecruiter !== undefined) data.linkedInRecruiter = linkedInRecruiter;
      if (city !== undefined) data.city = city;
      if (state !== undefined) data.state = state;
      if (country !== undefined) data.country = country;
      if (timeZone !== undefined) data.timeZone = timeZone;
      if (notes !== undefined) data.notes = notes;
      if (customFields !== undefined) data.customFields = customFields;
      return data;
    };

    if (action === 'create') {
      if (!firstName) throw new Error('firstName is required to create a contact');
      let contact = await client.createContact(buildData() as any);
      return {
        output: { contact },
        message: `Created contact **${contact.firstName ?? ''} ${contact.lastName ?? ''}** (ID: ${contact.id}).`
      };
    }

    if (action === 'update') {
      if (!contactId) throw new Error('contactId is required to update a contact');
      let contact = await client.updateContact(contactId, buildData());
      return {
        output: { contact },
        message: `Updated contact **${contactId}**.`
      };
    }

    if (action === 'delete') {
      if (!contactId) throw new Error('contactId is required to delete a contact');
      await client.deleteContact(contactId);
      return {
        output: { deleted: true },
        message: `Deleted contact **${contactId}**.`
      };
    }

    // search
    if (!email) throw new Error('email is required to search for a contact');
    let contacts = await client.searchContacts(email);
    let results = Array.isArray(contacts) ? contacts : [contacts];
    return {
      output: { contacts: results },
      message: `Found **${results.length}** contact(s) matching **${email}**.`
    };
  })
  .build();
