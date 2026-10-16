import { createApiServiceError, SlateTool } from 'slates';
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
      scriptInputs: z
        .array(
          z.object({
            name: z.string(),
            type: z.string(),
            default: z.any().optional(),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('Input declarations for a new inline script only'),
      scriptOutputs: z
        .array(
          z.object({ name: z.string(), type: z.string(), description: z.string().optional() })
        )
        .optional()
        .describe('Output declarations for a new inline script only'),
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
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete BigML response'),
      executionId: z.string().describe('BigML resource ID for the execution'),
      scriptId: z.string().optional().describe('Script ID that was executed'),
      statusCode: z.number().describe('Status code'),
      statusMessage: z.string().describe('Status message'),
      outputs: z.array(z.any()).optional().describe('Execution output values (if finished)'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    if (
      Number(ctx.input.scriptId !== undefined) + Number(ctx.input.sourceCode !== undefined) !==
      1
    ) {
      throw createApiServiceError('Provide exactly one of scriptId or sourceCode.');
    }
    if (
      ctx.input.inputs?.some(
        pair => pair.length !== 2 || typeof pair[0] !== 'string' || pair[1] === undefined
      )
    ) {
      throw createApiServiceError('inputs must contain [name, value] pairs.');
    }
    if (
      ctx.input.scriptId !== undefined &&
      (ctx.input.scriptInputs !== undefined || ctx.input.scriptOutputs !== undefined)
    ) {
      throw createApiServiceError('scriptInputs and scriptOutputs only apply to sourceCode.');
    }
    let client = createClient(ctx);

    let scriptId = ctx.input.scriptId;

    // If source code is provided without a script ID, create the script first
    if (!scriptId && ctx.input.sourceCode) {
      let scriptBody: Record<string, unknown> = {
        source_code: ctx.input.sourceCode
      };
      if (ctx.input.scriptInputs !== undefined) scriptBody.inputs = ctx.input.scriptInputs;
      if (ctx.input.scriptOutputs !== undefined) scriptBody.outputs = ctx.input.scriptOutputs;
      if (ctx.input.tags !== undefined) scriptBody.tags = ctx.input.tags;
      if (ctx.input.name !== undefined) scriptBody.name = `Script: ${ctx.input.name}`;
      if (ctx.input.projectId !== undefined) scriptBody.project = ctx.input.projectId;

      let scriptResult = await client.createResource('script', scriptBody);
      scriptId = scriptResult.resource;
      ctx.info(`Created script: ${scriptId}`);
    }

    if (!scriptId) {
      throw createApiServiceError('Either scriptId or nonempty sourceCode must be provided');
    }

    await client.waitForScript(scriptId, ctx.input.projectId);

    let body: Record<string, unknown> = {
      script: scriptId
    };

    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.inputs) body.inputs = ctx.input.inputs;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (ctx.input.projectId !== undefined) body.project = ctx.input.projectId;

    let result = await client.createResource('execution', body);

    return {
      output: {
        raw: result,
        executionId: result.resource,
        scriptId: scriptId,
        statusCode: result.status.code,
        statusMessage: result.status.message,
        outputs: result.execution?.outputs,
        created: result.created
      },
      message: `Execution **${result.resource}** created for script ${scriptId}. Status: ${result.status.message}. Execution is asynchronous — retrieve the resource when finished to see outputs.`
    };
  })
  .build();
