import { SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { spec } from '../spec';

export let codeCompletionTool = SlateTool.create(spec, {
  name: 'Code Completion (FIM)',
  key: 'code_completion',
  description: `Generate code using fill-in-the-middle (FIM) completion. Provide a code prompt and optional suffix to generate code that fits between them. Ideal for code insertion, auto-completion, and infilling tasks.`,
  instructions: [
    'Use "codestral-latest" or another Codestral model for best results.',
    'The suffix parameter provides context for what comes after the generated code.',
    'Without a suffix, the model generates a continuation of the prompt.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .default('codestral-latest')
        .describe('Code model ID (e.g., "codestral-latest")'),
      prompt: z.string().describe('Code/text before the completion point'),
      suffix: z.string().optional().describe('Code/text after the completion point'),
      maxTokens: z.number().optional().describe('Maximum tokens to generate'),
      temperature: z.number().min(0).max(2).optional().describe('Sampling temperature'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling threshold'),
      stop: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Stop sequence(s)'),
      randomSeed: z.number().optional().describe('Seed for deterministic output')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique completion ID'),
      model: z.string().describe('Model used'),
      generatedCode: z.string().describe('Generated code content'),
      finishReason: z.string().describe('Reason generation stopped'),
      usage: z.object({
        promptTokens: z.number().describe('Tokens in the prompt'),
        completionTokens: z.number().describe('Tokens generated'),
        totalTokens: z.number().describe('Total tokens used')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.fimCompletion({
      model: ctx.input.model,
      prompt: ctx.input.prompt,
      suffix: ctx.input.suffix,
      maxTokens: ctx.input.maxTokens,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      stop: ctx.input.stop,
      randomSeed: ctx.input.randomSeed
    });

    let choice = result.choices?.[0];
    let generatedCode = choice?.message?.content || '';

    return {
      output: {
        completionId: result.id,
        model: result.model,
        generatedCode,
        finishReason: choice?.finish_reason || 'unknown',
        usage: {
          promptTokens: result.usage?.prompt_tokens || 0,
          completionTokens: result.usage?.completion_tokens || 0,
          totalTokens: result.usage?.total_tokens || 0
        }
      },
      message: `Generated code completion using **${result.model}** (${result.usage?.total_tokens || 0} tokens).\n\n\`\`\`\n${generatedCode.substring(0, 300)}${generatedCode.length > 300 ? '...' : ''}\n\`\`\``
    };
  })
  .build();
