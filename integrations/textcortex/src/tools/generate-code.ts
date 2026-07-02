import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateCode = SlateTool.create(spec, {
  name: 'Generate Code',
  key: 'generate_code',
  description: `Generate code or SQL queries from natural language descriptions. Specify a programming language and describe what you need — the AI will produce corresponding code. Supports SQL query generation from table descriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe('Natural language description of the code or SQL query to generate'),
      programmingLanguage: z
        .string()
        .optional()
        .describe(
          'Target programming language (e.g., "python", "javascript", "sql", "java", "go")'
        ),
      model: z
        .enum(['velox-1', 'alta-1', 'sophos-1', 'chat-sophos-1'])
        .optional()
        .describe('AI model to use'),
      maxTokens: z
        .number()
        .optional()
        .describe('Maximum number of tokens to generate (default: 1024)'),
      temperature: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Creativity level from 0 to 1. Default: 0.7'),
      generationCount: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Number of code variations to generate (default: 1)')
    })
  )
  .output(
    z.object({
      codeOutputs: z
        .array(
          z.object({
            text: z.string().describe('Generated code'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of generated code outputs'),
      remainingCredits: z.number().describe('Remaining API credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateCode({
      prompt: ctx.input.prompt,
      programmingLanguage: ctx.input.programmingLanguage,
      model: ctx.input.model,
      maxTokens: ctx.input.maxTokens,
      temperature: ctx.input.temperature,
      n: ctx.input.generationCount
    });

    let outputs = result.data.outputs;

    return {
      output: {
        codeOutputs: outputs.map(o => ({ text: o.text, index: o.index })),
        remainingCredits: result.data.remaining_credits
      },
      message: `Generated **${outputs.length}** code output(s)${ctx.input.programmingLanguage ? ` in ${ctx.input.programmingLanguage}` : ''}. Remaining credits: ${result.data.remaining_credits}.`
    };
  })
  .build();
