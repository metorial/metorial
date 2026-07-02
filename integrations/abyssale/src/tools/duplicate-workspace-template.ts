import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let duplicateWorkspaceTemplate = SlateTool.create(spec, {
  name: 'Duplicate Workspace Template',
  key: 'duplicate_workspace_template',
  description: `Duplicate a workspace template into a target project. This is an asynchronous operation — use "Get Duplication Status" to track progress.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      workspaceTemplateId: z.string().describe('UUID of the workspace template to duplicate'),
      projectId: z.string().describe('UUID of the target project'),
      name: z
        .string()
        .optional()
        .describe('Custom name for the duplicated design (2-100 characters)')
    })
  )
  .output(
    z.object({
      duplicationRequestId: z
        .string()
        .describe('UUID of the duplication request for tracking progress')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.duplicateWorkspaceTemplate(ctx.input.workspaceTemplateId, {
      projectId: ctx.input.projectId,
      name: ctx.input.name
    });

    return {
      output: {
        duplicationRequestId: result.duplication_request_id
      },
      message: `Duplication request created. Request ID: \`${result.duplication_request_id}\`. Use "Get Duplication Status" to track progress.`
    };
  })
  .build();

export let getDuplicationStatus = SlateTool.create(spec, {
  name: 'Get Duplication Status',
  key: 'get_duplication_status',
  description: `Check the status of a workspace template duplication request. Returns progress status and details about duplicated designs once complete.`,
  constraints: ['Duplication requests are available for up to 7 days.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      duplicationRequestId: z.string().describe('UUID of the duplication request')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Duplication request UUID'),
      status: z.string().describe('Status: INIT, IN_PROGRESS, ERROR, or COMPLETED'),
      createdAt: z.string().describe('Unix timestamp of creation'),
      completedAt: z.string().nullable().describe('Unix timestamp of completion'),
      erroredAt: z.string().nullable().describe('Unix timestamp of error'),
      targetProject: z
        .object({
          projectId: z.string(),
          name: z.string(),
          createdAt: z.string()
        })
        .describe('Target project details'),
      designs: z
        .array(
          z.object({
            originalDesignId: z.string(),
            targetDesignId: z.string(),
            targetDesignName: z.string()
          })
        )
        .describe('Duplicated design mappings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.getDuplicationRequestStatus(ctx.input.duplicationRequestId);

    return {
      output: {
        requestId: result.request_id,
        status: result.status,
        createdAt: String(result.created_at_ts),
        completedAt: result.completed_at_ts !== null ? String(result.completed_at_ts) : null,
        erroredAt: result.errored_at_ts !== null ? String(result.errored_at_ts) : null,
        targetProject: {
          projectId: result.target_project.id,
          name: result.target_project.name,
          createdAt: String(result.target_project.created_at_ts)
        },
        designs: result.designs.map(d => ({
          originalDesignId: d.original_design_id,
          targetDesignId: d.target_design_id,
          targetDesignName: d.target_design_name
        }))
      },
      message: `Duplication request \`${result.request_id}\`: **${result.status}**. ${result.designs.length} design(s) duplicated into project **${result.target_project.name}**.`
    };
  })
  .build();
