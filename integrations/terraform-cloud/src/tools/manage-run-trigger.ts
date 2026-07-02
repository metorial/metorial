import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listRunTriggersTool = SlateTool.create(spec, {
  name: 'List Run Triggers',
  key: 'list_run_triggers',
  description: `List run triggers (workspace dependencies) for a workspace. Run triggers automatically queue runs when dependent workspaces complete successfully.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to list run triggers for')
    })
  )
  .output(
    z.object({
      runTriggers: z.array(
        z.object({
          runTriggerId: z.string(),
          sourceWorkspaceId: z.string(),
          sourceWorkspaceName: z.string(),
          createdAt: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.listRunTriggers(ctx.input.workspaceId);

    let runTriggers = (response.data || []).map((d: any) => ({
      runTriggerId: d.id || '',
      sourceWorkspaceId: d.relationships?.sourceable?.data?.id || '',
      sourceWorkspaceName:
        d.attributes?.['sourceable-name'] || d.relationships?.sourceable?.data?.id || '',
      createdAt: d.attributes?.['created-at'] || ''
    }));

    return {
      output: { runTriggers },
      message: `Found **${runTriggers.length}** run trigger(s) for workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();

export let createRunTriggerTool = SlateTool.create(spec, {
  name: 'Create Run Trigger',
  key: 'create_run_trigger',
  description: `Create a run trigger that automatically queues a run in the target workspace whenever a run in the source workspace completes successfully. This enables workspace dependency chains.`
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .describe('The downstream workspace ID that will receive triggered runs'),
      sourceWorkspaceId: z
        .string()
        .describe(
          'The upstream workspace ID whose successful runs trigger runs in the target workspace'
        )
    })
  )
  .output(
    z.object({
      runTriggerId: z.string(),
      sourceWorkspaceId: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.createRunTrigger(
      ctx.input.workspaceId,
      ctx.input.sourceWorkspaceId
    );

    return {
      output: {
        runTriggerId: response.data?.id || '',
        sourceWorkspaceId: ctx.input.sourceWorkspaceId,
        success: true
      },
      message: `Created run trigger from workspace ${ctx.input.sourceWorkspaceId} to workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();

export let deleteRunTriggerTool = SlateTool.create(spec, {
  name: 'Delete Run Trigger',
  key: 'delete_run_trigger',
  description: `Remove a run trigger (workspace dependency). Runs in the target workspace will no longer be queued when the source workspace completes.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      runTriggerId: z.string().describe('The run trigger ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteRunTrigger(ctx.input.runTriggerId);

    return {
      output: { deleted: true },
      message: `Run trigger ${ctx.input.runTriggerId} has been removed.`
    };
  })
  .build();
