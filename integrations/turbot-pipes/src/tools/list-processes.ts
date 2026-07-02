import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let processSchema = z.object({
  processId: z.string().describe('Unique process identifier'),
  identityId: z.string().optional().describe('Identity ID that owns this process'),
  workspaceId: z.string().optional().describe('Workspace identifier'),
  pipelineId: z.string().optional().describe('Associated pipeline ID'),
  type: z.string().optional().describe('Process type'),
  state: z.string().optional().describe('Current process state'),
  createdAt: z.string().optional().describe('Start timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listProcesses = SlateTool.create(spec, {
  name: 'List Processes',
  key: 'list_processes',
  description: `List processes (background tasks) running in a workspace. Processes track asynchronous operations like scheduled snapshots, pipeline executions, and system tasks.`,
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
      filter: z
        .string()
        .optional()
        .describe("Filter expression using query filter syntax (e.g. state = 'running')"),
      limit: z.number().optional().describe('Maximum number of results to return'),
      nextToken: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      processes: z.array(processSchema).describe('List of processes'),
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
      result = await client.listOrgProcesses(ownerHandle, ctx.input.workspaceHandle, {
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken,
        where: ctx.input.filter
      });
    } else {
      result = await client.listUserProcesses(ownerHandle, ctx.input.workspaceHandle, {
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken,
        where: ctx.input.filter
      });
    }

    return {
      output: {
        processes: result.items,
        nextToken: result.nextToken
      },
      message: `Found **${result.items.length}** process(es) in workspace **${ctx.input.workspaceHandle}**${result.nextToken ? ' (more available)' : ''}.`
    };
  })
  .build();

export let getProcess = SlateTool.create(spec, {
  name: 'Get Process',
  key: 'get_process',
  description: `Get detailed information about a specific process, including its current state and execution details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceHandle: z.string().describe('Handle of the workspace'),
      processId: z.string().describe('Process ID to retrieve'),
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user). Defaults to the authenticated user.')
    })
  )
  .output(processSchema)
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

    let process = await client.getUserProcess(
      ownerHandle,
      ctx.input.workspaceHandle,
      ctx.input.processId
    );

    return {
      output: process,
      message: `Process **${process.processId}** is in state **${process.state || 'unknown'}** (type: ${process.type || 'unknown'}).`
    };
  })
  .build();
