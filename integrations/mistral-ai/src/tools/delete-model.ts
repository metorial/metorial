import { SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { spec } from '../spec';

export let deleteModelTool = SlateTool.create(spec, {
  name: 'Delete Fine-Tuned Model',
  key: 'delete_model',
  description: `Delete a fine-tuned model from your Mistral AI workspace. This permanently removes the model and cannot be undone. Only works on user-created fine-tuned models, not Mistral-provided models.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the fine-tuned model to delete')
    })
  )
  .output(
    z.object({
      modelId: z.string().describe('ID of the deleted model'),
      deleted: z.boolean().describe('Whether the model was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.deleteModel(ctx.input.modelId);

    return {
      output: {
        modelId: result.id,
        deleted: result.deleted === true
      },
      message: `Deleted model **${result.id}**.`
    };
  })
  .build();
