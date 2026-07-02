import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let personOutputSchema = z.object({
  personId: z.number().describe('SalesLoft person ID'),
  firstName: z.string().nullable().optional().describe('First name'),
  lastName: z.string().nullable().optional().describe('Last name'),
  displayName: z.string().nullable().optional().describe('Full display name'),
  emailAddress: z.string().nullable().optional().describe('Primary email address'),
  secondaryEmailAddress: z.string().nullable().optional().describe('Secondary email address'),
  phone: z.string().nullable().optional().describe('Primary phone number'),
  mobilePhone: z.string().nullable().optional().describe('Mobile phone number'),
  title: z.string().nullable().optional().describe('Job title'),
  city: z.string().nullable().optional().describe('City'),
  state: z.string().nullable().optional().describe('State'),
  country: z.string().nullable().optional().describe('Country'),
  linkedinUrl: z.string().nullable().optional().describe('LinkedIn profile URL'),
  jobSeniority: z.string().nullable().optional().describe('Job seniority level'),
  doNotContact: z.boolean().nullable().optional().describe('Do-not-contact flag'),
  accountId: z.number().nullable().optional().describe('Associated account ID'),
  ownerId: z.number().nullable().optional().describe('Owner user ID'),
  customFields: z.record(z.string(), z.any()).nullable().optional().describe('Custom fields'),
  tags: z.array(z.string()).nullable().optional().describe('Tags applied to this person'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp')
});

let mapPerson = (raw: any) => ({
  personId: raw.id,
  firstName: raw.first_name,
  lastName: raw.last_name,
  displayName: raw.display_name,
  emailAddress: raw.email_address,
  secondaryEmailAddress: raw.secondary_email_address,
  phone: raw.phone,
  mobilePhone: raw.mobile_phone,
  title: raw.title,
  city: raw.city,
  state: raw.state,
  country: raw.country,
  linkedinUrl: raw.linkedin_url,
  jobSeniority: raw.job_seniority,
  doNotContact: raw.do_not_contact,
  accountId: raw.account?.id ?? null,
  ownerId: raw.owner?.id ?? null,
  customFields: raw.custom_fields,
  tags: raw.tags,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

export let createPerson = SlateTool.create(spec, {
  name: 'Create Person',
  key: 'create_person',
  description: `Create a new person (contact) in SalesLoft. Requires either an email address or both phone and last name. Supports setting contact details, job information, account association, tags, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      emailAddress: z
        .string()
        .optional()
        .describe('Primary email address (required if phone + lastName not provided)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z
        .string()
        .optional()
        .describe('Last name (required if emailAddress not provided)'),
      phone: z
        .string()
        .optional()
        .describe('Phone number (required with lastName if emailAddress not provided)'),
      phoneExtension: z.string().optional().describe('Phone extension'),
      mobilePhone: z.string().optional().describe('Mobile phone number'),
      homePhone: z.string().optional().describe('Home phone number'),
      title: z.string().optional().describe('Job title'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State/Province'),
      country: z.string().optional().describe('Country'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
      personalWebsite: z.string().optional().describe('Personal website URL'),
      jobSeniority: z.string().optional().describe('Job seniority level'),
      accountId: z.number().optional().describe('ID of the account to associate with'),
      ownerId: z.number().optional().describe('ID of the user who owns this person'),
      tags: z.array(z.string()).optional().describe('Tags to apply'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs'),
      doNotContact: z.boolean().optional().describe('Mark as do-not-contact')
    })
  )
  .output(personOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.emailAddress) body.email_address = ctx.input.emailAddress;
    if (ctx.input.firstName) body.first_name = ctx.input.firstName;
    if (ctx.input.lastName) body.last_name = ctx.input.lastName;
    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.phoneExtension) body.phone_extension = ctx.input.phoneExtension;
    if (ctx.input.mobilePhone) body.mobile_phone = ctx.input.mobilePhone;
    if (ctx.input.homePhone) body.home_phone = ctx.input.homePhone;
    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.city) body.city = ctx.input.city;
    if (ctx.input.state) body.state = ctx.input.state;
    if (ctx.input.country) body.country = ctx.input.country;
    if (ctx.input.linkedinUrl) body.linkedin_url = ctx.input.linkedinUrl;
    if (ctx.input.personalWebsite) body.personal_website = ctx.input.personalWebsite;
    if (ctx.input.jobSeniority) body.job_seniority = ctx.input.jobSeniority;
    if (ctx.input.accountId) body.account_id = ctx.input.accountId;
    if (ctx.input.ownerId) body.owner_id = ctx.input.ownerId;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.customFields) body.custom_fields = ctx.input.customFields;
    if (ctx.input.doNotContact !== undefined) body.do_not_contact = ctx.input.doNotContact;

    let person = await client.createPerson(body);
    let output = mapPerson(person);

    return {
      output,
      message: `Created person **${output.displayName || output.emailAddress || 'Unknown'}** (ID: ${output.personId}).`
    };
  })
  .build();

export let updatePerson = SlateTool.create(spec, {
  name: 'Update Person',
  key: 'update_person',
  description: `Update an existing person (contact) in SalesLoft. Provide the person ID and any fields to update. Only provided fields will be changed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to update'),
      emailAddress: z.string().optional().describe('Updated primary email address'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      phone: z.string().optional().describe('Updated phone number'),
      mobilePhone: z.string().optional().describe('Updated mobile phone number'),
      title: z.string().optional().describe('Updated job title'),
      city: z.string().optional().describe('Updated city'),
      state: z.string().optional().describe('Updated state'),
      country: z.string().optional().describe('Updated country'),
      linkedinUrl: z.string().optional().describe('Updated LinkedIn URL'),
      jobSeniority: z.string().optional().describe('Updated job seniority'),
      accountId: z.number().optional().describe('Updated account ID'),
      ownerId: z.number().optional().describe('Updated owner user ID'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      customFields: z.record(z.string(), z.any()).optional().describe('Updated custom fields'),
      doNotContact: z.boolean().optional().describe('Updated do-not-contact flag')
    })
  )
  .output(personOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.emailAddress !== undefined) body.email_address = ctx.input.emailAddress;
    if (ctx.input.firstName !== undefined) body.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) body.last_name = ctx.input.lastName;
    if (ctx.input.phone !== undefined) body.phone = ctx.input.phone;
    if (ctx.input.mobilePhone !== undefined) body.mobile_phone = ctx.input.mobilePhone;
    if (ctx.input.title !== undefined) body.title = ctx.input.title;
    if (ctx.input.city !== undefined) body.city = ctx.input.city;
    if (ctx.input.state !== undefined) body.state = ctx.input.state;
    if (ctx.input.country !== undefined) body.country = ctx.input.country;
    if (ctx.input.linkedinUrl !== undefined) body.linkedin_url = ctx.input.linkedinUrl;
    if (ctx.input.jobSeniority !== undefined) body.job_seniority = ctx.input.jobSeniority;
    if (ctx.input.accountId !== undefined) body.account_id = ctx.input.accountId;
    if (ctx.input.ownerId !== undefined) body.owner_id = ctx.input.ownerId;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (ctx.input.customFields !== undefined) body.custom_fields = ctx.input.customFields;
    if (ctx.input.doNotContact !== undefined) body.do_not_contact = ctx.input.doNotContact;

    let person = await client.updatePerson(ctx.input.personId, body);
    let output = mapPerson(person);

    return {
      output,
      message: `Updated person **${output.displayName || output.emailAddress || 'Unknown'}** (ID: ${output.personId}).`
    };
  })
  .build();

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Fetch a single person (contact) from SalesLoft by their ID. Returns full contact details including email, phone, job info, account association, tags, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to fetch')
    })
  )
  .output(personOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let person = await client.getPerson(ctx.input.personId);
    let output = mapPerson(person);

    return {
      output,
      message: `Fetched person **${output.displayName || output.emailAddress || 'Unknown'}** (ID: ${output.personId}).`
    };
  })
  .build();

export let deletePerson = SlateTool.create(spec, {
  name: 'Delete Person',
  key: 'delete_person',
  description: `Permanently delete a person (contact) from SalesLoft. This action is irreversible.`,
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
    let client = new Client({ token: ctx.auth.token });
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

let paginationOutputSchema = z.object({
  perPage: z.number().describe('Results per page'),
  currentPage: z.number().describe('Current page number'),
  nextPage: z.number().nullable().describe('Next page number, null if last page'),
  prevPage: z.number().nullable().describe('Previous page number, null if first page')
});

export let listPeople = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description: `List people (contacts) in SalesLoft with optional filtering by email, tag, cadence, account, or owner. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (1-100, default: 25)'),
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by (e.g., "updated_at", "created_at")'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      emailAddresses: z.array(z.string()).optional().describe('Filter by email addresses'),
      tagId: z.number().optional().describe('Filter by tag ID'),
      cadenceId: z.number().optional().describe('Filter by cadence membership'),
      accountId: z.number().optional().describe('Filter by account ID'),
      ownerId: z.number().optional().describe('Filter by owner user ID')
    })
  )
  .output(
    z.object({
      people: z.array(personOutputSchema).describe('List of people'),
      paging: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listPeople(ctx.input);
    let people = result.data.map(mapPerson);

    return {
      output: {
        people,
        paging: result.metadata.paging
      },
      message: `Found **${people.length}** people (page ${result.metadata.paging.currentPage}).`
    };
  })
  .build();
