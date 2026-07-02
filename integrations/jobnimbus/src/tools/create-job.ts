import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createJob = SlateTool.create(spec, {
  name: 'Create Job',
  key: 'create_job',
  description: `Create a new job (project) in JobNimbus. Jobs must be associated with a contact. You can set the job name, address, workflow status, and more.`,
  instructions: [
    'A contactId (primary) is required to link the job to an existing contact.',
    'Use the List Contacts or Search Contacts tool to find the contact ID first if needed.'
  ]
})
  .input(
    z.object({
      contactId: z.string().describe('The contact ID (jnid) to associate this job with'),
      name: z.string().optional().describe('Job name/title'),
      description: z.string().optional().describe('Job description'),
      recordTypeName: z.string().optional().describe('Workflow type name'),
      statusName: z.string().optional().describe('Workflow status name'),
      addressLine1: z.string().optional().describe('Job site address line 1'),
      addressLine2: z.string().optional().describe('Job site address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('Zip code'),
      country: z.string().optional().describe('Country'),
      sourceName: z.string().optional().describe('Lead source name'),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      salesRep: z.string().optional().describe('Sales rep user ID')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique JobNimbus ID of the created job'),
      name: z.string().optional().describe('Job name'),
      statusName: z.string().optional().describe('Current workflow status'),
      dateCreated: z.number().optional().describe('Unix timestamp of creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {
      primary: ctx.input.contactId
    };

    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.recordTypeName) data.record_type_name = ctx.input.recordTypeName;
    if (ctx.input.statusName) data.status_name = ctx.input.statusName;
    if (ctx.input.addressLine1) data.address_line1 = ctx.input.addressLine1;
    if (ctx.input.addressLine2) data.address_line2 = ctx.input.addressLine2;
    if (ctx.input.city) data.city = ctx.input.city;
    if (ctx.input.state) data.state_text = ctx.input.state;
    if (ctx.input.zip) data.zip = ctx.input.zip;
    if (ctx.input.country) data.country_name = ctx.input.country;
    if (ctx.input.sourceName) data.source_name = ctx.input.sourceName;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.salesRep) data.sales_rep = ctx.input.salesRep;

    let result = await client.createJob(data);

    return {
      output: {
        jobId: result.jnid,
        name: result.name,
        statusName: result.status_name,
        dateCreated: result.date_created
      },
      message: `Created job **${result.name || result.jnid}** linked to contact ${ctx.input.contactId}.`
    };
  })
  .build();
