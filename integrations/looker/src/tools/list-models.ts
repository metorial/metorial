import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  LookerClient,
  type LookerLookmlModel,
  type LookerLookmlModelExploreField,
  type LookerLookmlModelNavExplore
} from '../lib/client';
import { spec } from '../spec';

let requireResponseName = (
  value: string | null | undefined,
  resource: 'model' | 'explore' | 'field'
) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw createApiServiceError(`Looker returned a ${resource} without a name.`, {
      reason: `looker_lookml_${resource}_name_missing`
    });
  }

  return value;
};

export let listModels = SlateTool.create(spec, {
  name: 'List LookML Models',
  key: 'list_models',
  description: `List available LookML models and their explores, or get details about a specific model or explore. Use this to discover what data models are available for querying.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelName: z
        .string()
        .optional()
        .describe('Model name to get details for a specific model'),
      exploreName: z
        .string()
        .optional()
        .describe('Explore name to get details for a specific explore within the model')
    })
  )
  .output(
    z.object({
      models: z
        .array(
          z.object({
            modelName: z.string().describe('Model name'),
            label: z.string().optional().describe('Model label'),
            projectName: z.string().optional().describe('Project name'),
            explores: z
              .array(
                z.object({
                  exploreName: z.string().describe('Explore name'),
                  label: z.string().optional().describe('Explore label'),
                  description: z.string().optional().describe('Explore description'),
                  hidden: z.boolean().optional().describe('Whether explore is hidden')
                })
              )
              .optional()
              .describe('Explores in this model')
          })
        )
        .optional()
        .describe('List of models'),
      explore: z
        .object({
          exploreId: z.string().optional().describe('Fully qualified explore identifier'),
          exploreName: z.string().describe('Explore name'),
          modelName: z.string().describe('Model name'),
          label: z.string().optional().describe('Explore label'),
          description: z.string().optional().describe('Explore description'),
          fields: z
            .object({
              dimensions: z
                .array(
                  z.object({
                    name: z.string().describe('Field name'),
                    label: z.string().optional().describe('Field label'),
                    type: z.string().optional().describe('Field type'),
                    description: z.string().optional().describe('Field description')
                  })
                )
                .optional()
                .describe('Available dimensions'),
              measures: z
                .array(
                  z.object({
                    name: z.string().describe('Field name'),
                    label: z.string().optional().describe('Field label'),
                    type: z.string().optional().describe('Field type'),
                    description: z.string().optional().describe('Field description')
                  })
                )
                .optional()
                .describe('Available measures'),
              filters: z
                .array(
                  z.object({
                    name: z.string().describe('Filter name'),
                    label: z.string().optional().describe('Filter label'),
                    type: z.string().optional().describe('Filter type'),
                    description: z.string().optional().describe('Filter description')
                  })
                )
                .optional()
                .describe('Available filter-only fields'),
              parameters: z
                .array(
                  z.object({
                    name: z.string().describe('Parameter name'),
                    label: z.string().optional().describe('Parameter label'),
                    type: z.string().optional().describe('Parameter type'),
                    description: z.string().optional().describe('Parameter description')
                  })
                )
                .optional()
                .describe('Available parameter fields')
            })
            .optional()
            .describe('Available fields (only for explore details)')
        })
        .optional()
        .describe('Explore details')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.modelName !== undefined && ctx.input.modelName.length === 0) {
      throw createApiServiceError('modelName cannot be empty.', {
        reason: 'looker_model_name_empty'
      });
    }
    if (ctx.input.exploreName !== undefined && ctx.input.exploreName.length === 0) {
      throw createApiServiceError('exploreName cannot be empty.', {
        reason: 'looker_explore_name_empty'
      });
    }
    if (ctx.input.exploreName !== undefined && ctx.input.modelName === undefined) {
      throw createApiServiceError('modelName is required when exploreName is provided.', {
        reason: 'looker_explore_model_name_required'
      });
    }

    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    if (ctx.input.modelName !== undefined && ctx.input.exploreName !== undefined) {
      let explore = await client.getLookmlModelExplore(
        ctx.input.modelName,
        ctx.input.exploreName
      );

      let mapField = (field: LookerLookmlModelExploreField) => ({
        name: requireResponseName(field.name, 'field'),
        label: field.label_short ?? field.label ?? undefined,
        type: field.type ?? undefined,
        description: field.description ?? undefined
      });

      return {
        output: {
          explore: {
            exploreId:
              typeof explore.id === 'string' && explore.id.length > 0 ? explore.id : undefined,
            exploreName: requireResponseName(explore.name, 'explore'),
            modelName: requireResponseName(explore.model_name, 'model'),
            label: explore.label ?? undefined,
            description: explore.description ?? undefined,
            fields: {
              dimensions: explore.fields?.dimensions?.map(mapField),
              measures: explore.fields?.measures?.map(mapField),
              filters: explore.fields?.filters?.map(mapField),
              parameters: explore.fields?.parameters?.map(mapField)
            }
          }
        },
        message: `Retrieved explore **${explore.label ?? explore.name ?? ctx.input.exploreName}** from model **${ctx.input.modelName}** with ${explore.fields?.dimensions?.length ?? 0} dimensions and ${explore.fields?.measures?.length ?? 0} measures.`
      };
    }

    if (ctx.input.modelName !== undefined) {
      let model = await client.getLookmlModel(ctx.input.modelName);
      return {
        output: {
          models: [
            {
              modelName: requireResponseName(model.name, 'model'),
              label: model.label ?? undefined,
              projectName: model.project_name ?? undefined,
              explores: model.explores?.map(explore => ({
                exploreName: requireResponseName(explore.name, 'explore'),
                label: explore.label ?? undefined,
                description: explore.description ?? undefined,
                hidden: explore.hidden ?? undefined
              }))
            }
          ]
        },
        message: `Retrieved model **${model.label ?? model.name ?? ctx.input.modelName}** with ${model.explores?.length ?? 0} explore(s).`
      };
    }

    let models = await client.listLookmlModels();
    if (!Array.isArray(models)) {
      throw createApiServiceError('Looker returned an invalid LookML model list.', {
        reason: 'looker_lookml_model_list_invalid'
      });
    }
    let mapExplore = (explore: LookerLookmlModelNavExplore) => ({
      exploreName: requireResponseName(explore.name, 'explore'),
      label: explore.label ?? undefined,
      description: explore.description ?? undefined,
      hidden: explore.hidden ?? undefined
    });
    let mappedModels = models.map((model: LookerLookmlModel) => ({
      modelName: requireResponseName(model.name, 'model'),
      label: model.label ?? undefined,
      projectName: model.project_name ?? undefined,
      explores: model.explores?.map(mapExplore)
    }));

    return {
      output: { models: mappedModels },
      message: `Found **${mappedModels.length}** LookML model(s).`
    };
  })
  .build();
