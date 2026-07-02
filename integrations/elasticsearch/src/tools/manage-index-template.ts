import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { elasticsearchServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageIndexTemplateTool = SlateTool.create(spec, {
  name: 'Manage Index Template',
  key: 'manage_index_template',
  description: `Create, retrieve, list, or delete Elasticsearch composable index templates. Index templates define settings, mappings, and aliases that apply automatically when matching indices or data streams are created.`,
  instructions: [
    'Use action "create" with templateName, indexPatterns, and optional template settings, mappings, aliases, composedOf, priority, version, metadata, or dataStream.',
    'Use action "get" with templateName for one template, or action "list" to retrieve all templates.',
    'Use action "delete" with templateName to remove a template.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'delete'])
        .describe('The index template action to perform'),
      templateName: z
        .string()
        .optional()
        .describe('Template name, required for create, get, and delete actions'),
      indexPatterns: z
        .array(z.string())
        .optional()
        .describe('Index patterns matched by the template, required for create action'),
      template: z
        .object({
          settings: z.record(z.string(), z.any()).optional().describe('Index settings'),
          mappings: z.record(z.string(), z.any()).optional().describe('Index mappings'),
          aliases: z.record(z.string(), z.any()).optional().describe('Index aliases')
        })
        .optional()
        .describe('Template body applied to matching indices'),
      composedOf: z
        .array(z.string())
        .optional()
        .describe('Component template names to compose into this template'),
      priority: z.number().optional().describe('Template priority'),
      version: z.number().optional().describe('Template version'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata stored as _meta'),
      dataStream: z
        .record(z.string(), z.any())
        .optional()
        .describe('Data stream template configuration')
    })
  )
  .output(
    z.object({
      acknowledged: z.boolean().optional().describe('Whether the request was acknowledged'),
      templateName: z.string().optional().describe('Template name'),
      templates: z.any().optional().describe('Index template response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.templateName) {
          throw elasticsearchServiceError('templateName is required for create action');
        }
        if (!ctx.input.indexPatterns || ctx.input.indexPatterns.length === 0) {
          throw elasticsearchServiceError('indexPatterns is required for create action');
        }

        let body: Record<string, any> = {
          index_patterns: ctx.input.indexPatterns
        };
        if (ctx.input.template) body.template = ctx.input.template;
        if (ctx.input.composedOf) body.composed_of = ctx.input.composedOf;
        if (ctx.input.priority !== undefined) body.priority = ctx.input.priority;
        if (ctx.input.version !== undefined) body.version = ctx.input.version;
        if (ctx.input.metadata) body._meta = ctx.input.metadata;
        if (ctx.input.dataStream) body.data_stream = ctx.input.dataStream;

        let result = await client.putIndexTemplate(ctx.input.templateName, body);
        return {
          output: {
            acknowledged: result.acknowledged ?? true,
            templateName: ctx.input.templateName
          },
          message: `Index template **${ctx.input.templateName}** created or updated.`
        };
      }
      case 'get': {
        if (!ctx.input.templateName) {
          throw elasticsearchServiceError('templateName is required for get action');
        }

        let result = await client.getIndexTemplate(ctx.input.templateName);
        return {
          output: {
            templateName: ctx.input.templateName,
            templates: result
          },
          message: `Retrieved index template **${ctx.input.templateName}**.`
        };
      }
      case 'list': {
        let result = await client.getIndexTemplate();
        let templateCount = Array.isArray(result?.index_templates)
          ? result.index_templates.length
          : 0;
        return {
          output: {
            templates: result
          },
          message: `Retrieved **${templateCount}** index templates.`
        };
      }
      case 'delete': {
        if (!ctx.input.templateName) {
          throw elasticsearchServiceError('templateName is required for delete action');
        }

        let result = await client.deleteIndexTemplate(ctx.input.templateName);
        return {
          output: {
            acknowledged: result.acknowledged ?? true,
            templateName: ctx.input.templateName
          },
          message: `Index template **${ctx.input.templateName}** deleted.`
        };
      }
    }
  })
  .build();
