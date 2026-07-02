import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExecutionClient } from '../lib/client';
import { spec } from '../spec';

export let executeJavascript = SlateTool.create(spec, {
  name: 'Execute JavaScript',
  key: 'execute_javascript',
  description: `Executes custom JavaScript code on the CustomJS platform and returns the result. Supports Node.js with full NPM module support including axios, moment, uuid, jsonwebtoken, crypto, openai, and many more. Use this for data transformations, calculations, API integrations, and custom business logic.`,
  instructions: [
    'The code must contain a `return` statement to produce output.',
    'Access input data via the `input` variable (always a string). Use `JSON.parse(input)` for structured data.',
    'NPM modules can be imported with `require()`. Available modules include: cheerio, uuid, axios, jsonwebtoken, crypto, openai, moment, nodemailer, pdf-lib, and others.'
  ],
  constraints: ['Maximum execution time is 60 seconds.', 'Maximum payload size is 6MB.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      code: z
        .string()
        .describe('JavaScript code to execute. Must contain a `return` statement.'),
      input: z
        .string()
        .optional()
        .describe(
          'Input data passed to the code as the `input` variable (string). Use JSON.stringify for objects.'
        ),
      returnBinary: z
        .boolean()
        .optional()
        .default(false)
        .describe('Set to true if the code returns binary data (e.g., files, images).')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The return value from the executed code.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExecutionClient({ token: ctx.auth.token });

    let result = await client.executeCode({
      code: ctx.input.code,
      input: ctx.input.input,
      returnBinary: ctx.input.returnBinary,
      origin: 'slates/executeJavascript'
    });

    return {
      output: { result },
      message: `JavaScript code executed successfully.`
    };
  })
  .build();
