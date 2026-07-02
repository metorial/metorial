import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { modelDetailsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List available models on the Ollama server. Can list locally available models, currently running/loaded models, or both.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeRunning: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Also include currently running/loaded models with runtime details like VRAM usage and context length.'
        )
    })
  )
  .output(
    z.object({
      models: z
        .array(
          z.object({
            name: z.string().describe('Full model name including tag.'),
            model: z.string().describe('Model identifier.'),
            modifiedAt: z.string().describe('ISO 8601 timestamp of last modification.'),
            size: z.number().describe('Model size in bytes.'),
            digest: z.string().describe('SHA256 digest of the model.'),
            details: modelDetailsSchema
          })
        )
        .describe('List of locally available models.'),
      runningModels: z
        .array(
          z.object({
            name: z.string().describe('Full model name including tag.'),
            model: z.string().describe('Model identifier.'),
            modifiedAt: z.string().describe('ISO 8601 timestamp of last modification.'),
            size: z.number().describe('Model size in bytes.'),
            digest: z.string().describe('SHA256 digest of the model.'),
            details: modelDetailsSchema,
            expiresAt: z
              .string()
              .optional()
              .describe('When the model will be unloaded from memory.'),
            sizeVram: z.number().optional().describe('VRAM usage in bytes.'),
            contextLength: z.number().optional().describe('Current context window size.')
          })
        )
        .optional()
        .describe(
          'Currently running/loaded models. Only included when includeRunning is true.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let models = await client.listModels();
    let runningModels = ctx.input.includeRunning
      ? await client.listRunningModels()
      : undefined;

    let runningInfo = runningModels ? ` **${runningModels.length}** currently running.` : '';

    return {
      output: {
        models,
        runningModels
      },
      message: `Found **${models.length}** available model(s).${runningInfo}`
    };
  })
  .build();
