import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { ownerIds } from '../lib/records';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by its ID. Returns all available fields including name, address, contact info, workflow status, tags, and related records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .describe('The unique JobNimbus ID (jnid) of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique JobNimbus ID'),
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
      statusName: z.string().optional().describe('Current workflow status'),
      recordTypeName: z.string().optional().describe('Workflow type name'),
      sourceName: z.string().optional().describe('Lead source'),
      tags: z.array(z.string()).optional().describe('Tags'),
      owners: z.array(z.string()).optional().describe('Assignee IDs'),
      salesRep: z.string().optional().describe('Sales rep ID'),
      salesRepName: z.string().optional().describe('Sales rep name'),
      number: z.string().optional().describe('Record number'),
      dateCreated: z.number().optional().describe('Unix timestamp of creation'),
      dateUpdated: z.number().optional().describe('Unix timestamp of last update'),
      dateStart: z.number().optional().describe('Unix timestamp of start date'),
      dateEnd: z.number().optional().describe('Unix timestamp of end date'),
      createdByName: z.string().optional().describe('Name of record creator')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let c = await client.getContact(ctx.input.contactId);

    let output = {
      contactId: c.jnid,
      firstName: c.first_name ?? undefined,
      lastName: c.last_name ?? undefined,
      displayName: c.display_name ?? undefined,
      company: c.company ?? undefined,
      email: c.email ?? undefined,
      homePhone: c.home_phone ?? undefined,
      mobilePhone: c.mobile_phone ?? undefined,
      workPhone: c.work_phone ?? undefined,
      faxNumber: c.fax_number ?? undefined,
      website: c.website ?? undefined,
      addressLine1: c.address_line1 ?? undefined,
      addressLine2: c.address_line2 ?? undefined,
      city: c.city ?? undefined,
      state: c.state_text ?? undefined,
      zip: c.zip ?? undefined,
      country: c.country_name ?? undefined,
      description: c.description ?? undefined,
      statusName: c.status_name ?? undefined,
      recordTypeName: c.record_type_name ?? undefined,
      sourceName: c.source_name ?? undefined,
      tags: c.tags ?? undefined,
      owners: ownerIds(c.owners),
      salesRep: c.sales_rep ?? undefined,
      salesRepName: c.sales_rep_name ?? undefined,
      number: c.number ?? undefined,
      dateCreated: c.date_created ?? undefined,
      dateUpdated: c.date_updated ?? undefined,
      dateStart: c.date_start ?? undefined,
      dateEnd: c.date_end ?? undefined,
      createdByName: c.created_by_name ?? undefined
    };

    return {
      output,
      message: `Retrieved contact **${c.display_name || c.first_name || c.jnid}** (${c.status_name || 'no status'}).`
    };
  })
  .build();
