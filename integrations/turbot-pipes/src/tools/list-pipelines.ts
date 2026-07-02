import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pipelineSchema = z.object({
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
  lastProcessId: z.string().optional().describe('Last execution process ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List Flowpipe pipelines configured in a workspace. Pipelines automate workflows and can be triggered by schedules, webhooks, or manual execution.`,
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
        .describe('Owner handle (user or org). Defaults to the authenticated user.'),
      ownerType: z
        .enum(['user', 'org'])
        .default('user')
        .describe('Whether the owner is a user or organization'),
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
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let result: any;
    if (ctx.input.ownerType === 'org') {
      result = await client.listOrgPipelines(ownerHandle, ctx.input.workspaceHandle, {
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken
      });
    } else {
      result = await client.listUserPipelines(ownerHandle, ctx.input.workspaceHandle, {
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
  description: `Execute a Flowpipe pipeline command in a workspace. This triggers a pipeline run which will be tracked as a process.`
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
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user). Defaults to the authenticated user.')
    })
  )
  .output(
    z.object({
      executionResult: z.unknown().describe('Pipeline execution result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let result = await client.runPipelineCommand(
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
      message: `Executed pipeline command **${ctx.input.command}** on pipeline **${ctx.input.pipelineId}**.`
    };
  })
  .build();
