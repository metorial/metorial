import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let _vector3Schema = z
  .object({
    x: z.number(),
    y: z.number(),
    z: z.number()
  })
  .nullable()
  .optional();

let _contactSchema = z
  .object({
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional()
  })
  .nullable()
  .optional();

export let getModel = SlateTool.create(spec, {
  name: 'Get Model',
  key: 'get_model',
  description: `Retrieve complete details for a specific Matterport 3D model including its name, description, visibility, state, address, publication info, MLS data, and display options.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('The unique ID of the Matterport model')
    })
  )
  .output(
    z.object({
      modelId: z.string().describe('Unique model identifier'),
      name: z.string().nullable().describe('Name of the model'),
      state: z.string().nullable().describe('Activation state (active, inactive, pending)'),
      visibility: z
        .string()
        .nullable()
        .describe('Access visibility (private, public, unlisted)'),
      created: z.string().nullable().describe('Creation timestamp'),
      modified: z.string().nullable().describe('Last modified timestamp'),
      description: z.string().nullable().describe('Description of the model'),
      address: z.any().nullable().describe('Physical address of the space'),
      publication: z
        .any()
        .nullable()
        .describe('Publication details including contact and URLs'),
      mls: z.any().nullable().describe('MLS listing information'),
      options: z.any().nullable().describe('Display and interaction options')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let model = await client.getModel(ctx.input.modelId);

    return {
      output: {
        modelId: model.id,
        name: model.name,
        state: model.state,
        visibility: model.visibility,
        created: model.created,
        modified: model.modified,
        description: model.description,
        address: model.address || null,
        publication: model.publication || null,
        mls: model.mls || null,
        options: model.options || null
      },
      message: `Retrieved model **${model.name || model.id}** (state: ${model.state}, visibility: ${model.visibility}).`
    };
  })
  .build();
