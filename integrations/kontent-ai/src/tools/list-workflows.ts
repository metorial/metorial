import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { environmentIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `Retrieves all workflows defined in the environment. Returns workflow steps, transitions, and scope (which content types and collections the workflow applies to). Useful for understanding available workflow steps before changing a content item's workflow state.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({ environmentId: environmentIdInput }))
  .output(
    z.object({
      workflows: z.array(
        z.object({
          workflowId: z.string().describe('Internal ID of the workflow'),
          name: z.string().describe('Name of the workflow'),
          codename: z.string().describe('Codename of the workflow'),
          publishedStepId: z
            .string()
            .optional()
            .describe('ID of the predefined Published step'),
          scheduledStepId: z
            .string()
            .optional()
            .describe('ID of the predefined Scheduled step'),
          archivedStepId: z.string().optional().describe('ID of the predefined Archived step'),
          steps: z
            .array(
              z.object({
                stepId: z.string().describe('ID of the workflow step'),
                name: z.string().describe('Name of the step'),
                codename: z.string().describe('Codename of the step'),
                color: z.string().describe('Color code of the step'),
                transitionsTo: z
                  .array(z.string())
                  .describe('IDs or codenames of steps this can transition to')
              })
            )
            .describe('Workflow steps'),
          scopes: z
            .array(
              z.object({
                contentTypeIds: z
                  .array(z.string())
                  .optional()
                  .describe('Content type IDs this workflow applies to'),
                collectionIds: z
                  .array(z.string())
                  .optional()
                  .describe('Collection IDs this workflow applies to')
              })
            )
            .optional()
            .describe('Scopes defining which content types use this workflow')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.input.environmentId ?? ctx.config.environmentId
    });

    let workflows = await client.listWorkflows();

    let mapped = workflows.map(w => ({
      workflowId: w.id,
      name: w.name,
      codename: w.codename,
      publishedStepId: w.published_step?.id,
      scheduledStepId: w.scheduled_step?.id,
      archivedStepId: w.archived_step?.id,
      steps: (w.steps || []).map(s => ({
        stepId: s.id,
        name: s.name,
        codename: s.codename,
        color: s.color,
        transitionsTo: (s.transitions_to || []).map(t => t.step?.id || t.step?.codename || '')
      })),
      scopes: w.scopes?.map(s => ({
        contentTypeIds: s.content_types?.map(ct => ct.id || ct.codename || ''),
        collectionIds: s.collections?.map(
          collection => collection.id || collection.codename || ''
        )
      }))
    }));

    return {
      output: { workflows: mapped },
      message: `Retrieved **${mapped.length}** workflow(s).`
    };
  })
  .build();
