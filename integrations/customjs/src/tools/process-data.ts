import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExecutionClient } from '../lib/client';
import { spec } from '../spec';

export let processData = SlateTool.create(spec, {
  name: 'Process Data',
  key: 'process_data',
  description: `Data processing utilities for JSON and text. Supports **JSONPath** queries to extract values from nested JSON structures, and **Regex** operations (extract, replace, test, split) for pattern matching on text data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['json_path', 'regex'])
        .describe(
          'Processing mode: json_path for JSONPath queries, regex for regex operations.'
        ),
      jsonData: z
        .string()
        .optional()
        .describe('JSON string to query. Required for json_path mode.'),
      jsonPath: z
        .string()
        .optional()
        .describe(
          'JSONPath expression, e.g., "$[0].name" or "$.users[*].email". Required for json_path mode.'
        ),
      text: z.string().optional().describe('Input text to process. Required for regex mode.'),
      regexPattern: z
        .string()
        .optional()
        .describe('Regular expression pattern. Required for regex mode.'),
      regexFlags: z
        .string()
        .optional()
        .describe('Regex flags (e.g., "g", "i", "gi"). Optional for regex mode.'),
      regexOperation: z
        .enum(['Extract', 'Replace', 'Test', 'Split'])
        .optional()
        .describe('Regex operation to perform. Required for regex mode.'),
      replacement: z
        .string()
        .optional()
        .describe('Replacement text for the Replace operation.')
    })
  )
  .output(
    z.object({
      result: z
        .any()
        .describe(
          'The processing result. Type depends on operation: array for JSONPath/Extract/Split, string for Replace, boolean for Test.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExecutionClient({ token: ctx.auth.token });

    if (ctx.input.mode === 'json_path') {
      if (!ctx.input.jsonData) throw new Error('jsonData is required for json_path mode.');
      if (!ctx.input.jsonPath) throw new Error('jsonPath is required for json_path mode.');

      let result = await client.jsonPathQuery({
        json: ctx.input.jsonData,
        path: ctx.input.jsonPath
      });

      return {
        output: { result },
        message: `JSONPath query executed. Found ${Array.isArray(result) ? result.length : 1} result(s).`
      };
    } else {
      if (!ctx.input.text) throw new Error('text is required for regex mode.');
      if (!ctx.input.regexPattern) throw new Error('regexPattern is required for regex mode.');
      if (!ctx.input.regexOperation)
        throw new Error('regexOperation is required for regex mode.');

      let result = await client.regexOperation({
        text: ctx.input.text,
        pattern: ctx.input.regexPattern,
        flags: ctx.input.regexFlags,
        operation: ctx.input.regexOperation,
        replacement: ctx.input.replacement
      });

      return {
        output: { result },
        message: `Regex ${ctx.input.regexOperation} operation completed.`
      };
    }
  })
  .build();
