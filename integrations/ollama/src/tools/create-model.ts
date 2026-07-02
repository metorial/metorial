import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createModel = SlateTool.create(spec, {
  name: 'Create Model',
  key: 'create_model',
  description: `Create a new model. You can create from a Modelfile, derive from an existing model with a custom system prompt, template, or parameters, or quantize an existing model.`,
  instructions: [
    'To derive a model, set **from** to the base model name and optionally customize **system**, **template**, or **parameters**.',
    'To quantize, set **from** to the model to quantize and specify the **quantize** level (e.g., "q4_0", "q5_1").',
    'To create from a Modelfile, provide the full Modelfile content in the **modelfile** field.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      modelName: z.string().describe('Name for the new model (e.g., "my-custom-model").'),
      from: z.string().optional().describe('Base model to derive from (e.g., "llama3.2").'),
      modelfile: z.string().optional().describe('Full Modelfile content for model creation.'),
      quantize: z
        .string()
        .optional()
        .describe('Quantization level (e.g., "q4_0", "q4_1", "q5_0", "q5_1", "q8_0").'),
      system: z.string().optional().describe('Custom system prompt for the model.'),
      template: z.string().optional().describe('Custom prompt template.'),
      parameters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom model parameters.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the create operation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    ctx.progress(`Creating model **${ctx.input.modelName}**...`);
    let result = await client.createModel({
      model: ctx.input.modelName,
      from: ctx.input.from,
      modelfile: ctx.input.modelfile,
      quantize: ctx.input.quantize,
      system: ctx.input.system,
      template: ctx.input.template,
      parameters: ctx.input.parameters
    });

    return {
      output: {
        status: result.status
      },
      message: `Model **${ctx.input.modelName}** created successfully. Status: ${result.status}`
    };
  })
  .build();
