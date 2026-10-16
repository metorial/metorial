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
        .describe(
          'Owner handle. Required for organizations; call list_organizations to discover organization handles. Defaults to the authenticated user for user scope.'
        ),
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
    let client = Client.fromContext(ctx);

    let ownerHandle = await client.resolveOwner(ctx.input.ownerType, ctx.input.ownerHandle);

    let result: Awaited<ReturnType<Client['listUserProcesses']>>;
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
  .output(processSchema)
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let ownerHandle = await client.resolveOwner(ctx.input.ownerType, ctx.input.ownerHandle);

    let readProcess =
      ctx.input.ownerType === 'org'
        ? client.getOrgProcess.bind(client)
        : client.getUserProcess.bind(client);
    let process = await readProcess(
      ownerHandle,
      ctx.input.workspaceHandle,
      ctx.input.processId
    );

    return {
      output: process,
      message: `Retrieved process **${process.processId}**.`
    };
  })
  .build();
