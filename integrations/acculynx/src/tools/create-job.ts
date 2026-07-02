import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createJobTool = SlateTool.create(spec, {
  name: 'Create Job',
  key: 'create_job',
  description: `Create a new job in AccuLynx. The job will be created in the "Lead (Unassigned)" milestone. Requires a contact ID for an existing contact. Optionally set trade type, work type, lead source, estimated value, and description.`,
  instructions: [
    'A contact must already exist in AccuLynx before creating a job. Use the Search Contacts or Create Contact tools first if needed.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the existing contact to associate with this job'),
      tradeType: z.string().optional().describe('Trade type for the job'),
      workType: z.string().optional().describe('Work type for the job'),
      leadSource: z.string().optional().describe('Lead source name'),
      leadSourceChild: z.string().optional().describe('Child lead source name'),
      estimatedJobValue: z.number().optional().describe('Estimated value of the job'),
      description: z.string().optional().describe('Description of the job')
    })
  )
  .output(
    z.object({
      job: z.record(z.string(), z.any()).describe('The created job object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let job = await client.createJob({
      contactId: ctx.input.contactId,
      tradeType: ctx.input.tradeType,
      workType: ctx.input.workType,
      leadSource: ctx.input.leadSource,
      leadSourceChild: ctx.input.leadSourceChild,
      estimatedJobValue: ctx.input.estimatedJobValue,
      description: ctx.input.description
    });

    return {
      output: { job },
      message: `Created new job for contact **${ctx.input.contactId}**.`
    };
  })
  .build();
