import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let registerModel = SlateTool.create(spec, {
  name: 'Register Model',
  key: 'register_model',
  description: `Register a trained model from a project leaderboard as a model package in the Model Registry. Registered model packages can then be deployed, shared, and used for compliance documentation.`
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe('ID of the trained model to register (from a project leaderboard)'),
      registeredModelName: z
        .string()
        .optional()
        .describe('Name for the registered model in the registry')
    })
  )
  .output(
    z.object({
      modelPackageId: z.string().describe('ID of the created model package'),
      name: z.string().optional().describe('Name of the model package'),
      registeredModelName: z.string().optional().describe('Registered model name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    let pkg = await client.createModelPackageFromLearningModel({
      modelId: ctx.input.modelId,
      registeredModelName: ctx.input.registeredModelName
    });

    return {
      output: {
        modelPackageId: pkg.id || pkg.modelPackageId,
        name: pkg.name,
        registeredModelName: pkg.registeredModelName
      },
      message: `Model registered as package **${pkg.id || pkg.modelPackageId}**${ctx.input.registeredModelName ? ` under "${ctx.input.registeredModelName}"` : ''}.`
    };
  })
  .build();
