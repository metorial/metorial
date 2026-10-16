import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pipelineSchema = z.object({
  pipelineId: z.string().describe('Unique pipeline identifier'),
  workspaceId: z.string().optional().describe('Workspace identifier'),
  title: z.string().optional().describe('Pipeline title'),
  pipeline: z.string().optional().describe('Pipeline type'),
  desiredState: z.string().optional().describe('Desired pipeline state'),
  state: z.string().optional().describe('Current pipeline state'),
  frequency: z
    .object({
      type: z.string().optional(),
      schedule: z.string().optional()
    })
    .optional()
    .describe('Pipeline schedule frequency'),
  args: z.unknown().optional().describe('Provider pipeline arguments without key conversion'),
  tags: z.unknown().optional().describe('Provider pipeline tags'),
  lastProcessId: z.string().optional().describe('Last execution process ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List scheduled workspace pipelines for snapshots, datatank refreshes and integration imports. Use list_workspaces to discover workspace handles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceHandle: z.string().describe('Handle of the workspace'),
      ownerHandle: z
        .string()
        .optional()
        .describe(
          'Owner handle. Required for organizations; call list_organizations to discover organization handles. Defaults to the authenticated user for user scope.'
        ),
      ownerType: z
        .enum(['user', 'org'])
        .default('user')
        .describe('Whether the owner is a user or organization'),
      filter: z.string().optional().describe('Optional Pipes query-filter expression'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      nextToken: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      pipelines: z.array(pipelineSchema).describe('List of pipelines'),
      nextToken: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let ownerHandle = await client.resolveOwner(ctx.input.ownerType, ctx.input.ownerHandle);

    let result: Awaited<ReturnType<Client['listUserPipelines']>>;
    if (ctx.input.ownerType === 'org') {
      result = await client.listOrgPipelines(ownerHandle, ctx.input.workspaceHandle, {
        where: ctx.input.filter,
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken
      });
    } else {
      result = await client.listUserPipelines(ownerHandle, ctx.input.workspaceHandle, {
        where: ctx.input.filter,
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken
      });
    }

    return {
      output: {
        pipelines: result.items,
        nextToken: result.nextToken
      },
      message: `Found **${result.items.length}** pipeline(s) in workspace **${ctx.input.workspaceHandle}**${result.nextToken ? ' (more available)' : ''}.`
    };
  })
  .build();

export let runPipeline = SlateTool.create(spec, {
  name: 'Run Pipeline',
  key: 'run_pipeline',
  description: `Run a scheduled workspace pipeline and return its process reference. Call list_pipelines to discover pipeline IDs.`
})
  .input(
    z.object({
      workspaceHandle: z.string().describe('Handle of the workspace'),
      pipelineId: z.string().describe('Pipeline ID to execute'),
      command: z.string().default('run').describe('Command to execute (e.g. "run")'),
      args: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Arguments to pass to the pipeline'),
      ownerType: z
        .enum(['user', 'org'])
        .optional()
        .describe('Whether the owner is a user or organization'),
      ownerHandle: z
        .string()
        .optional()
        .describe(
          'Owner handle. Required for organizations; call list_organizations to discover organization handles. Defaults to the authenticated user for user scope.'
        )
    })
  )
  .output(
    z.object({
      executionResult: z.unknown().describe('Pipeline execution result')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let ownerHandle = await client.resolveOwner(ctx.input.ownerType, ctx.input.ownerHandle);

    let runCommand =
      ctx.input.ownerType === 'org'
        ? client.runOrgPipelineCommand.bind(client)
        : client.runPipelineCommand.bind(client);
    let result = await runCommand(
      ownerHandle,
      ctx.input.workspaceHandle,
      ctx.input.pipelineId,
      {
        command: ctx.input.command,
        args: ctx.input.args
      }
    );

    return {
      output: { executionResult: result },
      message: `Submitted pipeline command **${ctx.input.command}** on pipeline **${ctx.input.pipelineId}**.`
    };
  })
  .build();
