import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runCustomModel = SlateTool.create(spec, {
  name: 'Run Custom Model',
  key: 'run_custom_model',
  description: `Run inference on a custom-trained NLP model deployed on Metatext AI. Provide the model ID and input text to get predictions from your own classification, extraction, or generation model.`,
  instructions: [
    'The model ID can be found in your Metatext AI dashboard under the model settings or deployment details.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe('The unique identifier of the custom model to run inference on'),
      text: z.string().describe('The text to send to the custom model for inference')
    })
  )
  .output(
    z.object({
      predictions: z
        .array(
          z.object({
            label: z.string().describe('The predicted label or class'),
            score: z.number().describe('Confidence score for the prediction')
          })
        )
        .optional()
        .describe('Classification or extraction predictions, if applicable'),
      generatedText: z
        .string()
        .optional()
        .describe('Generated text output, if the model is a generative model')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.runCustomModelInference(ctx.input.modelId, ctx.input.text);

    return {
      output: result,
      message: `Ran inference on custom model **${ctx.input.modelId}**.`
    };
  })
  .build();
