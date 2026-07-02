import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in JobNimbus. Contacts represent customers, leads, or other people you work with. You can set name, contact info, address, workflow status, tags, and more.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      displayName: z
        .string()
        .optional()
        .describe('Display name (auto-generated from first/last if omitted)'),
      company: z.string().optional().describe('Company name'),
      email: z.string().optional().describe('Email address'),
      homePhone: z.string().optional().describe('Home phone number'),
      mobilePhone: z.string().optional().describe('Mobile phone number'),
      workPhone: z.string().optional().describe('Work phone number'),
      faxNumber: z.string().optional().describe('Fax number'),
      website: z.string().optional().describe('Website URL'),
      addressLine1: z.string().optional().describe('Street address line 1'),
      addressLine2: z.string().optional().describe('Street address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('Zip code'),
      country: z.string().optional().describe('Country'),
      description: z.string().optional().describe('Description/notes'),
      recordTypeName: z.string().optional().describe('Workflow type name (e.g. "customer")'),
      statusName: z
        .string()
        .optional()
        .describe('Workflow status name (e.g. "Lead", "Active")'),
      sourceName: z.string().optional().describe('Lead source name'),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      salesRep: z.string().optional().describe('Sales rep user ID')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique JobNimbus ID of the created contact'),
      displayName: z.string().optional().describe('Display name'),
      statusName: z.string().optional().describe('Current workflow status'),
      dateCreated: z.number().optional().describe('Unix timestamp of creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.firstName) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName) data.last_name = ctx.input.lastName;
    if (ctx.input.displayName) data.display_name = ctx.input.displayName;
    if (ctx.input.company) data.company = ctx.input.company;
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.homePhone) data.home_phone = ctx.input.homePhone;
    if (ctx.input.mobilePhone) data.mobile_phone = ctx.input.mobilePhone;
    if (ctx.input.workPhone) data.work_phone = ctx.input.workPhone;
    if (ctx.input.faxNumber) data.fax_number = ctx.input.faxNumber;
    if (ctx.input.website) data.website = ctx.input.website;
    if (ctx.input.addressLine1) data.address_line1 = ctx.input.addressLine1;
    if (ctx.input.addressLine2) data.address_line2 = ctx.input.addressLine2;
    if (ctx.input.city) data.city = ctx.input.city;
    if (ctx.input.state) data.state_text = ctx.input.state;
    if (ctx.input.zip) data.zip = ctx.input.zip;
    if (ctx.input.country) data.country_name = ctx.input.country;
    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.recordTypeName) data.record_type_name = ctx.input.recordTypeName;
    if (ctx.input.statusName) data.status_name = ctx.input.statusName;
    if (ctx.input.sourceName) data.source_name = ctx.input.sourceName;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.salesRep) data.sales_rep = ctx.input.salesRep;

    let result = await client.createContact(data);

    return {
      output: {
        contactId: result.jnid,
        displayName: result.display_name,
        statusName: result.status_name,
        dateCreated: result.date_created
      },
      message: `Created contact **${result.display_name || result.first_name || result.jnid}** with status "${result.status_name || 'none'}".`
    };
  })
  .build();
