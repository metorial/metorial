import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailSchema = z
  .object({
    email: z.string().describe('Email address'),
    category: z.string().optional().describe('Category: "work", "personal", or "other"')
  })
  .describe('Email entry');

let phoneSchema = z
  .object({
    number: z.string().describe('Phone number'),
    category: z.string().optional().describe('Category: "work", "mobile", "home", or "other"')
  })
  .describe('Phone number entry');

let addressSchema = z
  .object({
    street: z.string().optional().describe('Street address'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State or region'),
    postalCode: z.string().optional().describe('Postal/zip code'),
    country: z.string().optional().describe('Country')
  })
  .describe('Physical address');

let socialSchema = z
  .object({
    url: z.string().describe('Social profile URL'),
    category: z
      .string()
      .optional()
      .describe('Category: "linkedin", "twitter", "facebook", etc.')
  })
  .describe('Social profile');

let websiteSchema = z
  .object({
    url: z.string().describe('Website URL'),
    category: z.string().optional().describe('Category: "work", "personal", or "other"')
  })
  .describe('Website entry');

let customFieldSchema = z
  .object({
    customFieldDefinitionId: z.number().describe('ID of the custom field definition'),
    value: z.any().describe('Value for the custom field')
  })
  .describe('Custom field value');

let personOutputSchema = z.object({
  personId: z.number().describe('Unique ID of the person'),
  name: z.string().nullable().describe('Full name'),
  firstName: z.string().nullable().optional().describe('First name'),
  lastName: z.string().nullable().optional().describe('Last name'),
  title: z.string().nullable().optional().describe('Job title'),
  companyId: z.number().nullable().optional().describe('Associated company ID'),
  companyName: z.string().nullable().optional().describe('Associated company name'),
  assigneeId: z.number().nullable().optional().describe('Assigned user ID'),
  contactTypeId: z.number().nullable().optional().describe('Contact type ID'),
  emails: z.array(z.any()).optional().describe('Email addresses'),
  phoneNumbers: z.array(z.any()).optional().describe('Phone numbers'),
  address: z.any().nullable().optional().describe('Physical address'),
  tags: z.array(z.string()).optional().describe('Tags'),
  details: z.string().nullable().optional().describe('Additional details/notes'),
  dateCreated: z.number().nullable().optional().describe('Creation timestamp (Unix)'),
  dateModified: z.number().nullable().optional().describe('Last modified timestamp (Unix)'),
  customFields: z.array(z.any()).optional().describe('Custom field values')
});

let mapPerson = (p: any) => ({
  personId: p.id,
  name: p.name,
  firstName: p.first_name,
  lastName: p.last_name,
  title: p.title,
  companyId: p.company_id,
  companyName: p.company_name,
  assigneeId: p.assignee_id,
  contactTypeId: p.contact_type_id,
  emails: p.emails,
  phoneNumbers: p.phone_numbers,
  address: p.address,
  tags: p.tags,
  details: p.details,
  dateCreated: p.date_created,
  dateModified: p.date_modified,
  customFields: p.custom_fields
});

export let createPerson = SlateTool.create(spec, {
  name: 'Create Person',
  key: 'create_person',
  description: `Create a new person (contact) record in Copper CRM. People represent individual contacts and can be associated with companies and opportunities.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the person'),
      emails: z.array(emailSchema).optional().describe('Email addresses'),
      phoneNumbers: z.array(phoneSchema).optional().describe('Phone numbers'),
      address: addressSchema.optional().describe('Physical address'),
      title: z.string().optional().describe('Job title'),
      companyId: z.number().optional().describe('ID of the associated company'),
      assigneeId: z.number().optional().describe('ID of the user to assign this person to'),
      contactTypeId: z.number().optional().describe('Contact type ID for categorization'),
      details: z.string().optional().describe('Additional notes or details'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
      socials: z.array(socialSchema).optional().describe('Social media profiles'),
      websites: z.array(websiteSchema).optional().describe('Websites'),
      customFields: z.array(customFieldSchema).optional().describe('Custom field values')
    })
  )
  .output(personOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.emails) body.emails = ctx.input.emails;
    if (ctx.input.phoneNumbers) body.phone_numbers = ctx.input.phoneNumbers;
    if (ctx.input.address) {
      body.address = {
        street: ctx.input.address.street,
        city: ctx.input.address.city,
        state: ctx.input.address.state,
        postal_code: ctx.input.address.postalCode,
        country: ctx.input.address.country
      };
    }
    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.companyId) body.company_id = ctx.input.companyId;
    if (ctx.input.assigneeId) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.contactTypeId) body.contact_type_id = ctx.input.contactTypeId;
    if (ctx.input.details) body.details = ctx.input.details;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.socials) body.socials = ctx.input.socials;
    if (ctx.input.websites) body.websites = ctx.input.websites;
    if (ctx.input.customFields) {
      body.custom_fields = ctx.input.customFields.map(cf => ({
        custom_field_definition_id: cf.customFieldDefinitionId,
        value: cf.value
      }));
    }

    let person = await client.createPerson(body);

    return {
      output: mapPerson(person),
      message: `Created person **${person.name}** (ID: ${person.id}).`
    };
  })
  .build();

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Retrieve a person record by ID, or look up a person by email address. Returns full contact details including company association, tags, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().optional().describe('ID of the person to retrieve'),
      email: z
        .string()
        .optional()
        .describe('Email address to look up (used if personId is not provided)')
    })
  )
  .output(personOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let person: any;
    if (ctx.input.personId) {
      person = await client.getPerson(ctx.input.personId);
    } else if (ctx.input.email) {
      person = await client.lookupPersonByEmail(ctx.input.email);
    } else {
      throw new Error('Either personId or email must be provided');
    }

    return {
      output: mapPerson(person),
      message: `Retrieved person **${person.name}** (ID: ${person.id}).`
    };
  })
  .build();

export let updatePerson = SlateTool.create(spec, {
  name: 'Update Person',
  key: 'update_person',
  description: `Update an existing person record in Copper CRM. Only provided fields will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to update'),
      name: z.string().optional().describe('Updated full name'),
      emails: z
        .array(emailSchema)
        .optional()
        .describe('Updated email addresses (replaces existing)'),
      phoneNumbers: z
        .array(phoneSchema)
        .optional()
        .describe('Updated phone numbers (replaces existing)'),
      address: addressSchema.optional().describe('Updated physical address'),
      title: z.string().optional().describe('Updated job title'),
      companyId: z.number().optional().describe('Updated company ID'),
      assigneeId: z.number().optional().describe('Updated assignee user ID'),
      contactTypeId: z.number().optional().describe('Updated contact type ID'),
      details: z.string().optional().describe('Updated notes/details'),
      tags: z.array(z.string()).optional().describe('Updated tags (replaces existing)'),
      customFields: z
        .array(customFieldSchema)
        .optional()
        .describe('Updated custom field values')
    })
  )
  .output(personOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.emails !== undefined) body.emails = ctx.input.emails;
    if (ctx.input.phoneNumbers !== undefined) body.phone_numbers = ctx.input.phoneNumbers;
    if (ctx.input.address !== undefined) {
      body.address = {
        street: ctx.input.address.street,
        city: ctx.input.address.city,
        state: ctx.input.address.state,
        postal_code: ctx.input.address.postalCode,
        country: ctx.input.address.country
      };
    }
    if (ctx.input.title !== undefined) body.title = ctx.input.title;
    if (ctx.input.companyId !== undefined) body.company_id = ctx.input.companyId;
    if (ctx.input.assigneeId !== undefined) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.contactTypeId !== undefined) body.contact_type_id = ctx.input.contactTypeId;
    if (ctx.input.details !== undefined) body.details = ctx.input.details;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (ctx.input.customFields !== undefined) {
      body.custom_fields = ctx.input.customFields.map(cf => ({
        custom_field_definition_id: cf.customFieldDefinitionId,
        value: cf.value
      }));
    }

    let person = await client.updatePerson(ctx.input.personId, body);

    return {
      output: mapPerson(person),
      message: `Updated person **${person.name}** (ID: ${person.id}).`
    };
  })
  .build();

export let deletePerson = SlateTool.create(spec, {
  name: 'Delete Person',
  key: 'delete_person',
  description: `Permanently delete a person record from Copper CRM. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to delete')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('ID of the deleted person'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deletePerson(ctx.input.personId);

    return {
      output: {
        personId: ctx.input.personId,
        deleted: true
      },
      message: `Deleted person with ID ${ctx.input.personId}.`
    };
  })
  .build();

export let searchPeople = SlateTool.create(spec, {
  name: 'Search People',
  key: 'search_people',
  description: `Search for people in Copper CRM with flexible filtering. Supports filtering by name, email, phone, company, tags, assignee, contact type, and more. All filters are combined with AND logic.`,
  constraints: ['Maximum 200 results per page', 'Maximum 100,000 total results per search'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().default(1).describe('Page number (starting at 1)'),
      pageSize: z.number().optional().default(20).describe('Results per page (max 200)'),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Field to sort by: name, email, phone, date_modified, date_created, city, state, country'
        ),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      name: z.string().optional().describe('Filter by name (partial match)'),
      emails: z.array(z.string()).optional().describe('Filter by email addresses'),
      phoneNumber: z.string().optional().describe('Filter by phone number'),
      companyIds: z.array(z.number()).optional().describe('Filter by company IDs'),
      assigneeIds: z.array(z.number()).optional().describe('Filter by assignee user IDs'),
      contactTypeIds: z.array(z.number()).optional().describe('Filter by contact type IDs'),
      city: z.string().optional().describe('Filter by city'),
      state: z.string().optional().describe('Filter by state'),
      country: z.string().optional().describe('Filter by country'),
      tags: z.array(z.string()).optional().describe('Filter by tags')
    })
  )
  .output(
    z.object({
      people: z.array(personOutputSchema).describe('Matching person records'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {
      page_number: ctx.input.pageNumber,
      page_size: ctx.input.pageSize
    };
    if (ctx.input.sortBy) body.sort_by = ctx.input.sortBy;
    if (ctx.input.sortDirection) body.sort_direction = ctx.input.sortDirection;
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.emails) body.emails = ctx.input.emails;
    if (ctx.input.phoneNumber) body.phone_number = ctx.input.phoneNumber;
    if (ctx.input.companyIds) body.company_ids = ctx.input.companyIds;
    if (ctx.input.assigneeIds) body.assignee_ids = ctx.input.assigneeIds;
    if (ctx.input.contactTypeIds) body.contact_type_ids = ctx.input.contactTypeIds;
    if (ctx.input.city) body.city = ctx.input.city;
    if (ctx.input.state) body.state = ctx.input.state;
    if (ctx.input.country) body.country = ctx.input.country;
    if (ctx.input.tags) body.tags = ctx.input.tags;

    let people = await client.searchPeople(body);

    return {
      output: {
        people: people.map(mapPerson),
        count: people.length
      },
      message: `Found **${people.length}** people matching the search criteria.`
    };
  })
  .build();
