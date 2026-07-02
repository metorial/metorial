import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageModel = SlateTool.create(spec, {
  name: 'Manage Model',
  key: 'manage_model',
  description: `Get, create, update, or delete a content model (item type). Models define the structure of content records. Use this to inspect a model's configuration or modify the content schema.`,
  instructions: [
    'When creating a model, "name" and "apiKey" are required.',
    'To inspect a model and its fields, use action "get" with includeFields set to true.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'delete'])
        .describe('Action to perform on the model'),
      modelId: z.string().optional().describe('Model ID (required for get, update, delete)'),
      name: z.string().optional().describe('Display name for the model (required for create)'),
      apiKey: z
        .string()
        .optional()
        .describe('Programmatic API key for the model (required for create)'),
      singleton: z
        .boolean()
        .optional()
        .describe('If true, only one record of this model can exist'),
      sortable: z
        .boolean()
        .optional()
        .describe('If true, records can be reordered via drag-and-drop'),
      draftModeActive: z
        .boolean()
        .optional()
        .describe('If true, enables draft/published workflow'),
      allLocalesRequired: z
        .boolean()
        .optional()
        .describe('If true, all locales must be filled'),
      tree: z
        .boolean()
        .optional()
        .describe('If true, enables hierarchical organization of records'),
      collectionAppearance: z
        .enum(['compact', 'table'])
        .optional()
        .describe('How the record collection is displayed'),
      includeFields: z
        .boolean()
        .optional()
        .describe('For "get" action: also fetch all fields of the model')
    })
  )
  .output(
    z.object({
      model: z.any().describe('The model object'),
      fields: z
        .array(z.any())
        .optional()
        .describe('Array of field objects (when includeFields is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action, modelId, name, apiKey, includeFields, ...settings } = ctx.input;

    if (action === 'get') {
      if (!modelId) throw new Error('modelId is required for get action');
      let model = await client.getModel(modelId);
      let fields: any[] | undefined;
      if (includeFields) {
        fields = await client.listFields(modelId);
      }
      return {
        output: { model, fields },
        message: `Retrieved model **${model.name}** (API key: ${model.api_key})${fields ? ` with ${fields.length} fields` : ''}.`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('name is required for create action');
      if (!apiKey) throw new Error('apiKey is required for create action');
      let attributes: Record<string, any> = { name, api_key: apiKey };
      if (settings.singleton !== undefined) attributes.singleton = settings.singleton;
      if (settings.sortable !== undefined) attributes.sortable = settings.sortable;
      if (settings.draftModeActive !== undefined)
        attributes.draft_mode_active = settings.draftModeActive;
      if (settings.allLocalesRequired !== undefined)
        attributes.all_locales_required = settings.allLocalesRequired;
      if (settings.tree !== undefined) attributes.tree = settings.tree;
      if (settings.collectionAppearance)
        attributes.collection_appearance = settings.collectionAppearance;
      let model = await client.createModel(attributes);
      return {
        output: { model },
        message: `Created model **${model.name}** (ID: ${model.id}).`
      };
    }

    if (action === 'update') {
      if (!modelId) throw new Error('modelId is required for update action');
      let attributes: Record<string, any> = {};
      if (name) attributes.name = name;
      if (apiKey) attributes.api_key = apiKey;
      if (settings.singleton !== undefined) attributes.singleton = settings.singleton;
      if (settings.sortable !== undefined) attributes.sortable = settings.sortable;
      if (settings.draftModeActive !== undefined)
        attributes.draft_mode_active = settings.draftModeActive;
      if (settings.allLocalesRequired !== undefined)
        attributes.all_locales_required = settings.allLocalesRequired;
      if (settings.tree !== undefined) attributes.tree = settings.tree;
      if (settings.collectionAppearance)
        attributes.collection_appearance = settings.collectionAppearance;
      let model = await client.updateModel(modelId, attributes);
      return {
        output: { model },
        message: `Updated model **${model.name}** (ID: ${model.id}).`
      };
    }

    if (action === 'delete') {
      if (!modelId) throw new Error('modelId is required for delete action');
      let model = await client.deleteModel(modelId);
      return {
        output: { model },
        message: `Deleted model with ID **${modelId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
