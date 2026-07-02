import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in JobNimbus. Only the fields you provide will be updated; other fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .describe('The unique JobNimbus ID (jnid) of the contact to update'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      displayName: z.string().optional().describe('Display name'),
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
      recordTypeName: z.string().optional().describe('Workflow type name'),
      statusName: z.string().optional().describe('Workflow status name'),
      sourceName: z.string().optional().describe('Lead source name'),
      tags: z.array(z.string()).optional().describe('Tags (replaces existing tags)'),
      salesRep: z.string().optional().describe('Sales rep user ID')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique JobNimbus ID of the updated contact'),
      displayName: z.string().optional().describe('Display name'),
      statusName: z.string().optional().describe('Current workflow status'),
      dateUpdated: z.number().optional().describe('Unix timestamp of last update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) data.last_name = ctx.input.lastName;
    if (ctx.input.displayName !== undefined) data.display_name = ctx.input.displayName;
    if (ctx.input.company !== undefined) data.company = ctx.input.company;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.homePhone !== undefined) data.home_phone = ctx.input.homePhone;
    if (ctx.input.mobilePhone !== undefined) data.mobile_phone = ctx.input.mobilePhone;
    if (ctx.input.workPhone !== undefined) data.work_phone = ctx.input.workPhone;
    if (ctx.input.faxNumber !== undefined) data.fax_number = ctx.input.faxNumber;
    if (ctx.input.website !== undefined) data.website = ctx.input.website;
    if (ctx.input.addressLine1 !== undefined) data.address_line1 = ctx.input.addressLine1;
    if (ctx.input.addressLine2 !== undefined) data.address_line2 = ctx.input.addressLine2;
    if (ctx.input.city !== undefined) data.city = ctx.input.city;
    if (ctx.input.state !== undefined) data.state_text = ctx.input.state;
    if (ctx.input.zip !== undefined) data.zip = ctx.input.zip;
    if (ctx.input.country !== undefined) data.country_name = ctx.input.country;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.recordTypeName !== undefined)
      data.record_type_name = ctx.input.recordTypeName;
    if (ctx.input.statusName !== undefined) data.status_name = ctx.input.statusName;
    if (ctx.input.sourceName !== undefined) data.source_name = ctx.input.sourceName;
    if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;
    if (ctx.input.salesRep !== undefined) data.sales_rep = ctx.input.salesRep;

    let result = await client.updateContact(ctx.input.contactId, data);

    return {
      output: {
        contactId: result.jnid,
        displayName: result.display_name,
        statusName: result.status_name,
        dateUpdated: result.date_updated
      },
      message: `Updated contact **${result.display_name || result.jnid}**.`
    };
  })
  .build();
