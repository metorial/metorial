import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { ollamaServiceError } from '../lib/errors';
import { createModelMessageSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createModel = SlateTool.create(spec, {
  name: 'Create Model',
  key: 'create_model',
  description: `Create a new model from an existing model with custom system prompt, template, license, messages, parameters, or quantization settings.`,
  instructions: [
    'To derive a model, set **from** to the base model name and optionally customize **system**, **template**, **parameters**, **messages**, or **license**.',
    'To quantize, set **from** to the model to quantize and specify the **quantize** level (e.g., "q4_0", "q5_1").',
    'Provide at least one model source or customization field besides **modelName**.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      modelName: z.string().describe('Name for the new model (e.g., "my-custom-model").'),
      from: z.string().optional().describe('Base model to derive from (e.g., "llama3.2").'),
      quantize: z
        .string()
        .optional()
        .describe('Quantization level (e.g., "q4_0", "q4_1", "q5_0", "q5_1", "q8_0").'),
      license: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('License string or list of licenses for the model.'),
      system: z.string().optional().describe('Custom system prompt for the model.'),
      template: z.string().optional().describe('Custom prompt template.'),
      parameters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom model parameters.'),
      messages: z
        .array(createModelMessageSchema)
        .optional()
        .describe('Message history to use in the created model template.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the create operation.')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.from === undefined &&
      ctx.input.quantize === undefined &&
      ctx.input.license === undefined &&
      ctx.input.system === undefined &&
      ctx.input.template === undefined &&
      ctx.input.parameters === undefined &&
      ctx.input.messages === undefined
    ) {
      throw ollamaServiceError(
        'Provide from, quantize, license, system, template, parameters, or messages when creating a model.'
      );
    }

    if (ctx.input.quantize !== undefined && ctx.input.from === undefined) {
      throw ollamaServiceError('from is required when quantize is provided.');
    }

    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    ctx.progress(`Creating model **${ctx.input.modelName}**...`);
    let result = await client.createModel({
      model: ctx.input.modelName,
      from: ctx.input.from,
      quantize: ctx.input.quantize,
      license: ctx.input.license,
      system: ctx.input.system,
      template: ctx.input.template,
      parameters: ctx.input.parameters,
      messages: ctx.input.messages
    });

    return {
      output: {
        status: result.status
      },
      message: `Model **${ctx.input.modelName}** created successfully. Status: ${result.status}`
    };
  })
  .build();
