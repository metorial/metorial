import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

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
                .describe('Available filter-only fields')
            })
            .optional()
            .describe('Available fields (only for explore details)')
        })
        .optional()
        .describe('Explore details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    if (ctx.input.modelName && ctx.input.exploreName) {
      let explore = await client.getLookmlModelExplore(
        ctx.input.modelName,
        ctx.input.exploreName
      );

      let mapField = (f: any) => ({
        name: f.name,
        label: f.label_short || f.label,
        type: f.type,
        description: f.description
      });

      return {
        output: {
          explore: {
            exploreName: explore.name,
            modelName: explore.model_name,
            label: explore.label,
            description: explore.description,
            fields: {
              dimensions: explore.fields?.dimensions?.map(mapField),
              measures: explore.fields?.measures?.map(mapField),
              filters: explore.fields?.filters?.map(mapField)
            }
          }
        },
        message: `Retrieved explore **${explore.label || explore.name}** from model **${ctx.input.modelName}** with ${explore.fields?.dimensions?.length || 0} dimensions and ${explore.fields?.measures?.length || 0} measures.`
      };
    }

    if (ctx.input.modelName) {
      let model = await client.getLookmlModel(ctx.input.modelName);
      return {
        output: {
          models: [
            {
              modelName: model.name,
              label: model.label,
              projectName: model.project_name,
              explores: model.explores?.map((e: any) => ({
                exploreName: e.name,
                label: e.label,
                description: e.description,
                hidden: e.hidden
              }))
            }
          ]
        },
        message: `Retrieved model **${model.label || model.name}** with ${model.explores?.length || 0} explore(s).`
      };
    }

    let models = await client.listLookmlModels();
    let mappedModels = (models || []).map((m: any) => ({
      modelName: m.name,
      label: m.label,
      projectName: m.project_name,
      explores: m.explores?.map((e: any) => ({
        exploreName: e.name,
        label: e.label,
        description: e.description,
        hidden: e.hidden
      }))
    }));

    return {
      output: { models: mappedModels },
      message: `Found **${mappedModels.length}** LookML model(s).`
    };
  })
  .build();
