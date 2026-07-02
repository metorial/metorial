import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { docsumoServiceError } from '../lib/errors';
import { spec } from '../spec';

let approvalSchema = z.object({
  id: z.string().describe('Approval block ID from the workflow'),
  isApproved: z.boolean().describe('True to approve, false to reject'),
  reason: z.string().optional().describe('Optional approval/rejection reason')
});

export let updateCase = SlateTool.create(spec, {
  name: 'Update Case',
  key: 'update_case',
  description: `Partially update a Docsumo case. Supports renaming, changing stage, setting case fields, reassigning, acting on Human-in-the-Loop approvals, and optionally rerunning the workflow.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      casetypeId: z.string().describe('Case type ID. Get this from the List Agents tool.'),
      caseId: z.string().describe('Case ID to update'),
      stageId: z.string().optional().describe('Stage ID to move the case to'),
      caseFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Case field values keyed by case field ID'),
      assignedTo: z.string().optional().describe('User ID for the new assignee'),
      approval: approvalSchema.optional().describe('Human-in-the-Loop approval action'),
      triggerWorkflow: z
        .boolean()
        .optional()
        .describe('Whether to execute the case type workflow after updates'),
      caseName: z.string().optional().describe('New case name')
    })
  )
  .output(
    z.object({
      caseMetadata: z.record(z.string(), z.any()).optional().describe('Updated case metadata'),
      caseFields: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Updated case fields returned by Docsumo'),
      rawData: z.record(z.string(), z.any()).describe('Full Docsumo response data')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.stageId === undefined &&
      ctx.input.caseFields === undefined &&
      ctx.input.assignedTo === undefined &&
      ctx.input.approval === undefined &&
      ctx.input.triggerWorkflow === undefined &&
      ctx.input.caseName === undefined
    ) {
      throw docsumoServiceError(
        'Provide at least one case update field: stageId, caseFields, assignedTo, approval, triggerWorkflow, or caseName.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateCase({
      casetypeId: ctx.input.casetypeId,
      caseId: ctx.input.caseId,
      stageId: ctx.input.stageId,
      caseFields: ctx.input.caseFields,
      assignedTo: ctx.input.assignedTo,
      approval: ctx.input.approval,
      triggerWorkflow: ctx.input.triggerWorkflow,
      caseName: ctx.input.caseName
    });

    return {
      output: {
        caseMetadata: result.case_metadata,
        caseFields: result.case_fields,
        rawData: result
      },
      message: `Updated Docsumo case **${ctx.input.caseId}**.`
    };
  })
  .build();
