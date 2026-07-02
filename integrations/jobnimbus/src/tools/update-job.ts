import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateJob = SlateTool.create(spec, {
  name: 'Update Job',
  key: 'update_job',
  description: `Update an existing job (project) in JobNimbus. Only the fields you provide will be updated; other fields remain unchanged.`
})
  .input(
    z.object({
      jobId: z.string().describe('The unique JobNimbus ID (jnid) of the job to update'),
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
      tags: z.array(z.string()).optional().describe('Tags (replaces existing tags)'),
      salesRep: z.string().optional().describe('Sales rep user ID')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique JobNimbus ID of the updated job'),
      name: z.string().optional().describe('Job name'),
      statusName: z.string().optional().describe('Current workflow status'),
      dateUpdated: z.number().optional().describe('Unix timestamp of last update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.recordTypeName !== undefined)
      data.record_type_name = ctx.input.recordTypeName;
    if (ctx.input.statusName !== undefined) data.status_name = ctx.input.statusName;
    if (ctx.input.addressLine1 !== undefined) data.address_line1 = ctx.input.addressLine1;
    if (ctx.input.addressLine2 !== undefined) data.address_line2 = ctx.input.addressLine2;
    if (ctx.input.city !== undefined) data.city = ctx.input.city;
    if (ctx.input.state !== undefined) data.state_text = ctx.input.state;
    if (ctx.input.zip !== undefined) data.zip = ctx.input.zip;
    if (ctx.input.country !== undefined) data.country_name = ctx.input.country;
    if (ctx.input.sourceName !== undefined) data.source_name = ctx.input.sourceName;
    if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;
    if (ctx.input.salesRep !== undefined) data.sales_rep = ctx.input.salesRep;

    let result = await client.updateJob(ctx.input.jobId, data);

    return {
      output: {
        jobId: result.jnid,
        name: result.name,
        statusName: result.status_name,
        dateUpdated: result.date_updated
      },
      message: `Updated job **${result.name || result.jnid}**.`
    };
  })
  .build();
