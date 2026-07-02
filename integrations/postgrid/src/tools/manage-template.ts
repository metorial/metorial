import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrintMailClient } from '../lib/client';
import { spec } from '../spec';

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a reusable HTML template in PostGrid for letters, postcards, or self-mailers. Templates support merge variables using \`{{variableName}}\` syntax for dynamic personalization.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      description: z.string().optional().describe('Description of the template'),
      html: z
        .string()
        .describe('HTML content of the template. Supports {{variableName}} merge variables.'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom key-value metadata')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the created template'),
      description: z.string().optional().nullable().describe('Template description'),
      createdAt: z.string().optional().nullable().describe('Creation timestamp'),
      updatedAt: z.string().optional().nullable().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrintMailClient(ctx.auth.token);
    let template = await client.createTemplate(ctx.input);

    return {
      output: {
        templateId: template.id,
        description: template.description,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      message: `Template **${template.id}** created${template.description ? ` (${template.description})` : ''}.`
    };
  })
  .build();

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List and search PostGrid templates. Returns template IDs and descriptions for use in mail orders.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search query to filter templates'),
      skip: z.number().optional().describe('Number of records to skip'),
      limit: z.number().optional().describe('Maximum number of records to return (default 10)')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Template ID'),
            description: z.string().optional().nullable().describe('Template description'),
            createdAt: z.string().optional().nullable().describe('Creation timestamp'),
            updatedAt: z.string().optional().nullable().describe('Last update timestamp')
          })
        )
        .describe('List of templates'),
      totalCount: z.number().describe('Total number of matching templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrintMailClient(ctx.auth.token);
    let result = await client.listTemplates(ctx.input);

    let templates = (result.data || []).map((t: any) => ({
      templateId: t.id,
      description: t.description,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      output: {
        templates,
        totalCount: result.totalCount || 0
      },
      message: `Found **${result.totalCount || 0}** templates, returning ${templates.length}.`
    };
  })
  .build();
