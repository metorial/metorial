import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createJobTool = SlateTool.create(spec, {
  name: 'Create Job',
  key: 'create_job',
  description: `Create a new job in AccuLynx in the Lead milestone with no assigned representative. Requires an existing contact. Optionally set trade types, work type, lead source, category, priority, and notes. Use get_company_settings to discover classification IDs or names.`,
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
      tradeType: z.string().optional().describe('Trade type name or ID for the job'),
      workType: z.string().optional().describe('Work type name or numeric ID for the job'),
      leadSource: z.string().optional().describe('Lead source name'),
      leadSourceChild: z
        .string()
        .optional()
        .describe('Legacy field unsupported by the job creation API; omit this field'),
      estimatedJobValue: z
        .number()
        .optional()
        .describe('Legacy field unsupported by the job creation API; omit this field'),
      description: z
        .string()
        .max(1000)
        .optional()
        .describe('Notes for the job, up to 1000 characters'),
      tradeTypeIds: z
        .array(z.string())
        .optional()
        .describe('Trade type IDs from get_company_settings; takes precedence over tradeType'),
      workTypeId: z
        .number()
        .int()
        .optional()
        .describe('Work type ID from get_company_settings; takes precedence over workType'),
      leadSourceId: z
        .string()
        .optional()
        .describe(
          'Lead source ID from get_company_settings; takes precedence over leadSource'
        ),
      jobCategoryId: z
        .number()
        .int()
        .optional()
        .describe('Job category ID from get_company_settings'),
      priority: z.enum(['Urgent', 'High', 'Normal']).optional().describe('Priority of the job')
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
      description: ctx.input.description,
      tradeTypeIds: ctx.input.tradeTypeIds,
      workTypeId: ctx.input.workTypeId,
      leadSourceId: ctx.input.leadSourceId,
      jobCategoryId: ctx.input.jobCategoryId,
      priority: ctx.input.priority
    });

    return {
      output: { job },
      message: `Created new job for contact **${ctx.input.contactId}**.`
    };
  })
  .build();
