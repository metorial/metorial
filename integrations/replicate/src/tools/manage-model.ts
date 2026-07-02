import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { replicateServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createModel = SlateTool.create(spec, {
  name: 'Create Model',
  key: 'create_model',
  description: `Create a new model on Replicate. The model acts as a container for versions that will be created through training or pushing.`,
  constraints: [
    'Maximum of 1,000 models per account.',
    'Model names must be unique within an owner.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Owner username for the new model'),
      modelName: z.string().describe('Name for the new model'),
      visibility: z.enum(['public', 'private']).describe('Model visibility'),
      hardware: z.string().describe('Hardware SKU to run the model on (e.g. "gpu-a40-large")'),
      description: z.string().optional().describe('Description of the model'),
      githubUrl: z.string().optional().describe('GitHub repository URL'),
      paperUrl: z.string().optional().describe('Associated research paper URL'),
      licenseUrl: z.string().optional().describe('License URL'),
      coverImageUrl: z.string().optional().describe('Cover image URL')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Model owner'),
      modelName: z.string().describe('Model name'),
      visibility: z.string().describe('Model visibility'),
      url: z.string().optional().describe('URL to the model page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createModel({
      owner: ctx.input.owner,
      name: ctx.input.modelName,
      visibility: ctx.input.visibility,
      hardware: ctx.input.hardware,
      description: ctx.input.description,
      githubUrl: ctx.input.githubUrl,
      paperUrl: ctx.input.paperUrl,
      licenseUrl: ctx.input.licenseUrl,
      coverImageUrl: ctx.input.coverImageUrl
    });

    return {
      output: {
        owner: result.owner,
        modelName: result.name,
        visibility: result.visibility,
        url: result.url
      },
      message: `Model **${result.owner}/${result.name}** created as **${result.visibility}**.`
    };
  })
  .build();

export let updateModel = SlateTool.create(spec, {
  name: 'Update Model',
  key: 'update_model',
  description: `Update metadata of an existing model on Replicate, such as its description, readme, or associated URLs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Model owner username'),
      modelName: z.string().describe('Model name'),
      description: z.string().optional().describe('Updated description'),
      readme: z.string().optional().describe('Updated readme content (markdown)'),
      githubUrl: z.string().optional().describe('Updated GitHub URL'),
      paperUrl: z.string().optional().describe('Updated paper URL'),
      licenseUrl: z.string().optional().describe('Updated license URL'),
      coverImageUrl: z.string().optional().describe('Updated cover image URL'),
      weightsUrl: z
        .string()
        .optional()
        .describe('Updated model weights URL for supported models')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Model owner'),
      modelName: z.string().describe('Model name'),
      description: z.string().optional().nullable().describe('Updated description'),
      url: z.string().optional().describe('Model page URL')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.description === undefined &&
      ctx.input.readme === undefined &&
      ctx.input.githubUrl === undefined &&
      ctx.input.paperUrl === undefined &&
      ctx.input.licenseUrl === undefined &&
      ctx.input.coverImageUrl === undefined &&
      ctx.input.weightsUrl === undefined
    ) {
      throw replicateServiceError('Provide at least one model field to update.');
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateModel(ctx.input.owner, ctx.input.modelName, {
      description: ctx.input.description,
      readme: ctx.input.readme,
      githubUrl: ctx.input.githubUrl,
      paperUrl: ctx.input.paperUrl,
      licenseUrl: ctx.input.licenseUrl,
      coverImageUrl: ctx.input.coverImageUrl,
      weightsUrl: ctx.input.weightsUrl
    });

    return {
      output: {
        owner: result.owner,
        modelName: result.name,
        description: result.description,
        url: result.url
      },
      message: `Model **${result.owner}/${result.name}** updated.`
    };
  })
  .build();

export let deleteModel = SlateTool.create(spec, {
  name: 'Delete Model',
  key: 'delete_model',
  description: `Delete a model from Replicate. The model must be private, have no versions, and be owned by the authenticated user.`,
  constraints: [
    'Model must be private.',
    'Model must have no versions.',
    'Model must be owned by the authenticated user.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Model owner username'),
      modelName: z.string().describe('Model name to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the model was deleted'),
      owner: z.string().describe('Former model owner'),
      modelName: z.string().describe('Former model name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteModel(ctx.input.owner, ctx.input.modelName);

    return {
      output: {
        deleted: true,
        owner: ctx.input.owner,
        modelName: ctx.input.modelName
      },
      message: `Model **${ctx.input.owner}/${ctx.input.modelName}** deleted.`
    };
  })
  .build();
