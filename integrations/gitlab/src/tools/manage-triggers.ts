import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, gitLabServiceError, resolveProjectId } from '../lib/helpers';
import { spec } from '../spec';

let triggerTokenSchema = z.object({
  triggerId: z.number(),
  description: z.string(),
  token: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  lastUsed: z.string().optional().nullable(),
  ownerName: z.string().optional()
});

export let manageTriggers = SlateTool.create(spec, {
  name: 'Manage Pipeline Triggers',
  key: 'manage_triggers',
  description: `Create, list, update, or delete pipeline trigger tokens. Trigger tokens allow external services to run pipelines via the trigger API. Can also fire a pipeline using a trigger token with custom variables.`,
  instructions: [
    'Use action "list" to view all trigger tokens for a project.',
    'Use action "create" to create a new trigger token.',
    'Use action "update" to change the trigger description.',
    'Use action "delete" to remove a trigger token.',
    'Use action "fire" to trigger a pipeline run using a trigger token on a branch/tag.'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID or URL-encoded path. Falls back to config default.'),
      action: z
        .enum(['list', 'create', 'update', 'delete', 'fire'])
        .describe('Action to perform'),
      triggerId: z.number().optional().describe('Trigger ID (required for update, delete)'),
      description: z.string().optional().describe('Trigger description (required for create)'),
      triggerToken: z.string().optional().describe('Trigger token (required for fire)'),
      ref: z
        .string()
        .optional()
        .describe('Branch or tag to trigger pipeline on (required for fire)'),
      variables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs of variables to pass to the triggered pipeline')
    })
  )
  .output(
    z.object({
      triggers: z.array(triggerTokenSchema).optional(),
      trigger: triggerTokenSchema.optional(),
      pipeline: z
        .object({
          pipelineId: z.number(),
          status: z.string(),
          ref: z.string(),
          sha: z.string(),
          webUrl: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);
    let { action } = ctx.input;

    let mapTrigger = (t: any) => ({
      triggerId: t.id,
      description: t.description,
      token: t.token,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      lastUsed: t.last_used,
      ownerName: t.owner?.name || t.owner?.username
    });

    if (action === 'list') {
      let result = (await client.listPipelineTriggers(projectId)) as any[];
      let triggers = result.map(mapTrigger);
      return {
        output: { triggers },
        message: `Found **${triggers.length}** pipeline trigger(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.description)
        throw gitLabServiceError('description is required for create action');
      let t = await client.createPipelineTrigger(projectId, ctx.input.description);
      return {
        output: { trigger: mapTrigger(t) },
        message: `Created pipeline trigger **"${(t as any).description}"**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.triggerId)
        throw gitLabServiceError('triggerId is required for update action');
      if (!ctx.input.description)
        throw gitLabServiceError('description is required for update action');
      let t = await client.updatePipelineTrigger(
        projectId,
        ctx.input.triggerId,
        ctx.input.description
      );
      return {
        output: { trigger: mapTrigger(t) },
        message: `Updated pipeline trigger **#${ctx.input.triggerId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.triggerId)
        throw gitLabServiceError('triggerId is required for delete action');
      await client.deletePipelineTrigger(projectId, ctx.input.triggerId);
      return {
        output: { deleted: true },
        message: `Deleted pipeline trigger **#${ctx.input.triggerId}**.`
      };
    }

    // fire
    if (!ctx.input.triggerToken)
      throw gitLabServiceError('triggerToken is required for fire action');
    if (!ctx.input.ref) throw gitLabServiceError('ref is required for fire action');
    let p = (await client.triggerPipeline(
      projectId,
      ctx.input.triggerToken,
      ctx.input.ref,
      ctx.input.variables
    )) as any;
    return {
      output: {
        pipeline: {
          pipelineId: p.id,
          status: p.status,
          ref: p.ref,
          sha: p.sha,
          webUrl: p.web_url
        }
      },
      message: `Triggered pipeline **#${p.id}** on \`${p.ref}\` — status: **${p.status}**.`
    };
  })
  .build();
