import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve a single job (project) by its ID. Returns all available fields including name, address, status, related contact, tags, and assignees.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique JobNimbus ID (jnid) of the job to retrieve')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique JobNimbus ID'),
      name: z.string().optional().describe('Job name'),
      description: z.string().optional().describe('Job description'),
      number: z.string().optional().describe('Job number'),
      statusName: z.string().optional().describe('Current workflow status'),
      recordTypeName: z.string().optional().describe('Workflow type name'),
      addressLine1: z.string().optional().describe('Job site address line 1'),
      addressLine2: z.string().optional().describe('Job site address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('Zip code'),
      country: z.string().optional().describe('Country'),
      primaryContactId: z.string().optional().describe('Primary contact ID'),
      primaryContactName: z.string().optional().describe('Primary contact name'),
      sourceName: z.string().optional().describe('Lead source'),
      tags: z.array(z.string()).optional().describe('Tags'),
      owners: z.array(z.string()).optional().describe('Assignee IDs'),
      salesRep: z.string().optional().describe('Sales rep ID'),
      salesRepName: z.string().optional().describe('Sales rep name'),
      dateCreated: z.number().optional().describe('Unix timestamp of creation'),
      dateUpdated: z.number().optional().describe('Unix timestamp of last update'),
      dateStart: z.number().optional().describe('Unix timestamp of start date'),
      dateEnd: z.number().optional().describe('Unix timestamp of end date'),
      createdByName: z.string().optional().describe('Name of record creator')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let j = await client.getJob(ctx.input.jobId);

    return {
      output: {
        jobId: j.jnid,
        name: j.name,
        description: j.description,
        number: j.number,
        statusName: j.status_name,
        recordTypeName: j.record_type_name,
        addressLine1: j.address_line1,
        addressLine2: j.address_line2,
        city: j.city,
        state: j.state_text,
        zip: j.zip,
        country: j.country_name,
        primaryContactId: j.primary,
        primaryContactName: j.primary_name,
        sourceName: j.source_name,
        tags: j.tags,
        owners: j.owners,
        salesRep: j.sales_rep,
        salesRepName: j.sales_rep_name,
        dateCreated: j.date_created,
        dateUpdated: j.date_updated,
        dateStart: j.date_start,
        dateEnd: j.date_end,
        createdByName: j.created_by_name
      },
      message: `Retrieved job **${j.name || j.jnid}** (${j.status_name || 'no status'}).`
    };
  })
  .build();
