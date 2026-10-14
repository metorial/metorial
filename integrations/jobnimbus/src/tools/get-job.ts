import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { ownerIds, recordId, recordName } from '../lib/records';
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
        name: j.name ?? undefined,
        description: j.description ?? undefined,
        number: j.number ?? undefined,
        statusName: j.status_name ?? undefined,
        recordTypeName: j.record_type_name ?? undefined,
        addressLine1: j.address_line1 ?? undefined,
        addressLine2: j.address_line2 ?? undefined,
        city: j.city ?? undefined,
        state: j.state_text ?? undefined,
        zip: j.zip ?? undefined,
        country: j.country_name ?? undefined,
        primaryContactId: recordId(j.primary),
        primaryContactName: recordName(j.primary) ?? j.primary_name ?? undefined,
        sourceName: j.source_name ?? undefined,
        tags: j.tags ?? undefined,
        owners: ownerIds(j.owners),
        salesRep: j.sales_rep ?? undefined,
        salesRepName: j.sales_rep_name ?? undefined,
        dateCreated: j.date_created ?? undefined,
        dateUpdated: j.date_updated ?? undefined,
        dateStart: j.date_start ?? undefined,
        dateEnd: j.date_end ?? undefined,
        createdByName: j.created_by_name ?? undefined
      },
      message: `Retrieved job **${j.name || j.jnid}** (${j.status_name || 'no status'}).`
    };
  })
  .build();
