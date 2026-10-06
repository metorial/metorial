import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { orgIdInput, upstream } from '../lib/validation';
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
      orgId: orgIdInput,
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
            commandId: z
              .string()
              .describe(
                'Legacy field containing the native command value; the API describes this as the executed command, not an independently verified ID'
              ),
            commandName: z.string().describe('Command name'),
            systemId: z.string().describe('System ID that executed the command'),
            systemName: z.string().optional().describe('System name'),
            exitCode: z.number().optional().describe('Exit code (0 = success)'),
            output: z.string().optional().describe('Command stdout output'),
            error: z.string().optional().describe('Command stderr output'),
            requestTime: z.string().optional().describe('When the command was requested'),
            responseTime: z.string().optional().describe('When the command completed')
          })
        )
        .describe('Command execution results'),
      totalCount: z.number().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    try {
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
        systemId: r.systemId,
        systemName: r.system,
        exitCode: r.response?.data?.exitCode ?? r.exitCode,
        output: r.response?.data?.output,
        error: r.response?.error,
        requestTime: r.requestTime ?? undefined,
        responseTime: r.responseTime ?? undefined
      }));

      return {
        output: {
          results,
          totalCount: result.totalCount
        },
        message: `Found **${result.totalCount}** command results. Returned **${results.length}**.`
      };
    } catch (error) {
      throw upstream(error, client.didWrite);
    }
  })
  .build();
