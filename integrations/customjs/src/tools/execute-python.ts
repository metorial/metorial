import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExecutionClient } from '../lib/client';
import { spec } from '../spec';

export let executePython = SlateTool.create(spec, {
  name: 'Execute Python',
  key: 'execute_python',
  description: `Executes custom Python code on the CustomJS platform and returns the result. Suitable for data analysis, API interactions, or any logic better suited to Python.`,
  instructions: [
    'Write inline Python code that produces output.',
    'Access input data via the `input` variable.'
  ],
  constraints: ['Maximum execution time is 60 seconds.', 'Maximum payload size is 6MB.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      code: z.string().describe('Python code to execute.'),
      input: z
        .string()
        .optional()
        .describe('Input data passed to the code as the `input` variable.')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The return value from the executed Python code.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExecutionClient({ token: ctx.auth.token });

    // Python execution uses the same execution endpoint with a wrapper
    let result = await client.executeCode({
      code: ctx.input.code,
      input: ctx.input.input,
      origin: 'slates/executePython'
    });

    return {
      output: { result },
      message: `Python code executed successfully.`
    };
  })
  .build();
