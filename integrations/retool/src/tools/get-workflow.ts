import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getWorkflow = SlateTool.create(spec, {
  name: 'Get Workflow',
  key: 'get_workflow',
  description:
    'Read exact Retool workflow metadata. Call list_workflows to discover workflow IDs. This does not execute or enable the workflow.',
  tags: { readOnly: true }
})
  .input(
    z.object({ workflowId: z.string().describe('Native workflow UUID from list_workflows.') })
  )
  .output(
    z.object({
      workflowId: z.string(),
      workflowName: z.string(),
      folderId: z.string().nullable().optional(),
      isEnabled: z.boolean().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let workflow = (await clientFor(ctx).getWorkflow(ctx.input.workflowId)).data;
    return {
      output: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        folderId: workflow.folder_id,
        isEnabled: workflow.is_enabled,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at
      },
      message: 'Retrieved the requested workflow metadata.'
    };
  })
  .build();
