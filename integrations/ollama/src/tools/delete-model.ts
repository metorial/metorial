import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteModel = SlateTool.create(spec, {
  name: 'Delete Model',
  key: 'delete_model',
  description: `Remove a model from the Ollama server. This permanently deletes the model and its data from local storage.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      modelName: z.string().describe('Name of the model to delete (e.g., "llama3.2:latest").')
    })
  )
  .output(
    z.object({
      modelName: z.string().describe('Name of the deleted model.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    await client.deleteModel(ctx.input.modelName);

    return {
      output: {
        modelName: ctx.input.modelName
      },
      message: `Deleted model **${ctx.input.modelName}**.`
    };
  })
  .build();
