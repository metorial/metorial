import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPipelinesSteps = SlateTool.create(spec, {
  name: 'List Pipelines & Steps',
  key: 'list_pipelines_steps',
  description: `Retrieve the account's pipelines and their steps. Useful for discovering available pipeline configurations before creating or moving leads. Also lists activities, categories, tags, and fields configuration when requested.`,
  instructions: [
    'Use resource "pipelines" to get all pipelines.',
    'Use resource "steps" to get all pipeline steps.',
    'Use resource "activities" to get configured activity types.',
    'Use resource "categories" to get categories (optionally with tags).',
    'Use resource "predefined_tags" to get predefined tags.',
    'Use resource "fields" to get default fields for leads or client folders.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resource: z
        .enum(['pipelines', 'steps', 'activities', 'categories', 'predefined_tags', 'fields'])
        .describe('Which configuration resource to retrieve'),
      includeTags: z
        .boolean()
        .optional()
        .describe('Include tags within categories (for categories resource)'),
      fieldType: z
        .string()
        .optional()
        .describe('Filter fields by type: "lead" or "client" (for fields resource)')
    })
  )
  .output(
    z.object({
      pipelines: z
        .array(
          z.object({
            pipelineId: z.number().optional().describe('Pipeline ID'),
            name: z.string().describe('Pipeline name'),
            isDefault: z.boolean().optional().describe('Whether this is the default pipeline')
          })
        )
        .optional(),
      steps: z
        .array(
          z.object({
            stepId: z.number().optional().describe('Step ID'),
            name: z.string().describe('Step name'),
            pipelineId: z.number().optional().describe('Pipeline this step belongs to'),
            position: z.number().optional().describe('Step position in pipeline')
          })
        )
        .optional(),
      activities: z
        .array(
          z.object({
            activityId: z.number().describe('Activity ID'),
            name: z.string().describe('Activity name'),
            icon: z.string().optional().describe('Activity icon'),
            isDisabled: z.boolean().optional().describe('Whether the activity is disabled')
          })
        )
        .optional(),
      categories: z
        .array(
          z.object({
            categoryId: z.number().describe('Category ID'),
            name: z.string().describe('Category name'),
            tags: z.array(z.any()).optional().describe('Tags in the category')
          })
        )
        .optional(),
      predefinedTags: z
        .array(
          z.object({
            tagId: z.number().describe('Tag ID'),
            name: z.string().describe('Tag name'),
            categoryId: z.number().optional().describe('Category ID')
          })
        )
        .optional(),
      fields: z
        .array(
          z.object({
            fieldId: z.number().describe('Field ID'),
            name: z.string().describe('Field name'),
            fieldType: z.string().optional().describe('Field type'),
            parentType: z.string().optional().describe('Parent type (lead or client)'),
            isKey: z.boolean().optional().describe('Whether this field is a key field')
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    if (ctx.input.resource === 'pipelines') {
      let pipelines = await client.listPipelines();
      return {
        output: {
          pipelines: pipelines.map((p: any) => ({
            pipelineId: p.id,
            name: p.name,
            isDefault: p.is_default
          }))
        },
        message: `Found **${pipelines.length}** pipelines.`
      };
    }

    if (ctx.input.resource === 'steps') {
      let steps = await client.listSteps();
      return {
        output: {
          steps: steps.map((s: any) => ({
            stepId: s.id,
            name: s.name,
            pipelineId: s.pipeline_id,
            position: s.position
          }))
        },
        message: `Found **${steps.length}** pipeline steps.`
      };
    }

    if (ctx.input.resource === 'activities') {
      let activities = await client.listActivities();
      return {
        output: {
          activities: activities.map((a: any) => ({
            activityId: a.id,
            name: a.name,
            icon: a.icon,
            isDisabled: a.is_disabled
          }))
        },
        message: `Found **${activities.length}** activities.`
      };
    }

    if (ctx.input.resource === 'categories') {
      let categories = await client.listCategories(ctx.input.includeTags);
      return {
        output: {
          categories: categories.map((c: any) => ({
            categoryId: c.id,
            name: c.name,
            tags: c.tags
          }))
        },
        message: `Found **${categories.length}** categories.`
      };
    }

    if (ctx.input.resource === 'predefined_tags') {
      let tags = await client.listPredefinedTags();
      return {
        output: {
          predefinedTags: tags.map((t: any) => ({
            tagId: t.id,
            name: t.name,
            categoryId: t.category_id
          }))
        },
        message: `Found **${tags.length}** predefined tags.`
      };
    }

    if (ctx.input.resource === 'fields') {
      let fields = await client.listFields(ctx.input.fieldType);
      return {
        output: {
          fields: fields.map((f: any) => ({
            fieldId: f.id,
            name: f.name,
            fieldType: f.type,
            parentType: f.parent_type,
            isKey: f.is_key
          }))
        },
        message: `Found **${fields.length}** fields.`
      };
    }

    throw new Error(`Unknown resource: ${ctx.input.resource}`);
  })
  .build();
