import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let executeWhizzml = SlateTool.create(spec, {
  name: 'Execute WhizzML',
  key: 'execute_whizzml',
  description: `Execute a WhizzML script on BigML's servers. WhizzML is a domain-specific language for automating ML workflows. Provide either an existing script ID or inline source code to execute.
Executions run asynchronously — check the execution status and retrieve results when finished.`,
  instructions: [
    'To run an existing script, provide the scriptId.',
    'To run inline code, provide sourceCode directly.',
    'Pass input arguments as key-value pairs in the inputs field.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      scriptId: z
        .string()
        .optional()
        .describe('Existing WhizzML script resource ID to execute (e.g., "script/abc123")'),
      sourceCode: z
        .string()
        .optional()
        .describe('Inline WhizzML source code to create and execute'),
      name: z.string().optional().describe('Name for the execution'),
      inputs: z
        .array(z.array(z.any()))
        .optional()
        .describe(
          'Input arguments as [name, value] pairs (e.g., [["dataset-id", "dataset/abc123"]])'
        ),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      projectId: z.string().optional().describe('Project to associate with')
    })
  )
  .output(
    z.object({
      executionId: z.string().describe('BigML resource ID for the execution'),
      scriptId: z.string().optional().describe('Script ID that was executed'),
      statusCode: z.number().describe('Status code'),
      statusMessage: z.string().describe('Status message'),
      outputs: z.array(z.any()).optional().describe('Execution output values (if finished)'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let scriptId = ctx.input.scriptId;

    // If source code is provided without a script ID, create the script first
    if (!scriptId && ctx.input.sourceCode) {
      let scriptBody: Record<string, any> = {
        source_code: ctx.input.sourceCode
      };
      if (ctx.input.name) scriptBody.name = `Script: ${ctx.input.name}`;
      if (ctx.input.projectId) scriptBody.project = ctx.input.projectId;

      let scriptResult = await client.createResource('script', scriptBody);
      scriptId = scriptResult.resource;
      ctx.info(`Created script: ${scriptId}`);
    }

    if (!scriptId) {
      throw new Error('Either scriptId or sourceCode must be provided');
    }

    let body: Record<string, any> = {
      script: scriptId
    };

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.inputs) body.inputs = ctx.input.inputs;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.projectId) body.project = ctx.input.projectId;

    let result = await client.createResource('execution', body);

    return {
      output: {
        executionId: result.resource,
        scriptId: scriptId,
        statusCode: result.status?.code ?? result.code,
        statusMessage: result.status?.message ?? 'Created',
        outputs: result.execution?.outputs,
        created: result.created
      },
      message: `Execution **${result.resource}** created for script ${scriptId}. Status: ${result.status?.message ?? 'pending'}. Execution is asynchronous — retrieve the resource when finished to see outputs.`
    };
  })
  .build();
