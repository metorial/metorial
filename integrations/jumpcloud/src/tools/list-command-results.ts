import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCommandResults = SlateTool.create(spec, {
  name: 'List Command Results',
  key: 'list_command_results',
  description: `List results from previously executed JumpCloud commands. Shows exit codes, stdout output, errors, and execution timestamps. Useful for checking command execution status and debugging failures.`,
  constraints: [
    'Large result sets may timeout. Use pagination with small limits to avoid issues.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of results to return (default 50)'),
      skip: z.number().min(0).optional().describe('Number of results to skip for pagination'),
      filter: z
        .string()
        .optional()
        .describe('Filter expression, e.g. "command:$eq:commandId"'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, e.g. "-requestTime" for most recent first')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            resultId: z.string().describe('Command result ID'),
            commandId: z.string().describe('Command ID'),
            commandName: z.string().describe('Command name'),
            systemId: z.string().describe('System ID that executed the command'),
            systemName: z.string().optional().describe('System name'),
            exitCode: z.number().optional().describe('Exit code (0 = success)'),
            output: z.string().optional().describe('Command stdout output'),
            error: z.string().optional().describe('Command stderr output'),
            requestTime: z.string().describe('When the command was requested'),
            responseTime: z.string().optional().describe('When the command completed')
          })
        )
        .describe('Command execution results'),
      totalCount: z.number().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let result = await client.listCommandResults({
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      filter: ctx.input.filter,
      sort: ctx.input.sort
    });

    let results = result.results.map(r => ({
      resultId: r._id,
      commandId: r.command,
      commandName: r.name,
      systemId: r.systemId ?? r.system,
      systemName: r.system,
      exitCode: r.response?.data?.exitCode ?? r.exitCode,
      output: r.response?.data?.output,
      error: r.response?.data?.error,
      requestTime: r.requestTime,
      responseTime: r.responseTime
    }));

    return {
      output: {
        results,
        totalCount: result.totalCount
      },
      message: `Found **${result.totalCount}** command results. Returned **${results.length}**.`
    };
  })
  .build();
