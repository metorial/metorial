import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let manageEmailTemplates = SlateTool.create(spec, {
  name: 'Manage Email Templates',
  key: 'manage_email_templates',
  description: `Create, retrieve, update, or list email templates in Braze. Templates define reusable email content that can be used across campaigns and Canvases.`,
  instructions: [
    'Use action "list" to browse templates, "get" to fetch a specific template, "create" to add a new one, or "update" to modify an existing template.',
    'The body field should contain the HTML email content.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'update']).describe('Operation to perform'),
      templateId: z.string().optional().describe('Template ID (required for get and update)'),
      templateName: z.string().optional().describe('Template name (required for create)'),
      subject: z.string().optional().describe('Email subject line (required for create)'),
      body: z.string().optional().describe('HTML email body (required for create)'),
      plaintextBody: z.string().optional().describe('Plain text version of the email'),
      preheader: z.string().optional().describe('Email preheader text'),
      tags: z.array(z.string()).optional().describe('Tags to associate with the template'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Filter templates modified after this ISO 8601 timestamp (for list action)'),
      modifiedBefore: z
        .string()
        .optional()
        .describe(
          'Filter templates modified before this ISO 8601 timestamp (for list action)'
        ),
      limit: z.number().optional().describe('Max results to return (for list action)'),
      offset: z.number().optional().describe('Offset for pagination (for list action)')
    })
  )
  .output(
    z.object({
      templates: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of templates (for list action)'),
      templateId: z.string().optional().describe('Template ID'),
      templateName: z.string().optional().describe('Template name'),
      subject: z.string().optional().describe('Email subject'),
      body: z.string().optional().describe('HTML email body'),
      tags: z.array(z.string()).optional().describe('Template tags'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listEmailTemplates({
          modifiedAfter: ctx.input.modifiedAfter,
          modifiedBefore: ctx.input.modifiedBefore,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        let templates = (result.templates ?? []).map((t: any) => ({
          templateId: t.email_template_id,
          templateName: t.template_name,
          tags: t.tags,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
        return {
          output: {
            templates,
            message: result.message
          },
          message: `Found **${templates.length}** email template(s).`
        };
      }
      case 'get': {
        let result = await client.getEmailTemplate(ctx.input.templateId!);
        return {
          output: {
            templateId: result.email_template_id,
            templateName: result.template_name,
            subject: result.subject,
            body: result.body,
            tags: result.tags,
            createdAt: result.created_at,
            updatedAt: result.updated_at,
            message: result.message
          },
          message: `Retrieved template **${result.template_name ?? ctx.input.templateId}**.`
        };
      }
      case 'create': {
        let result = await client.createEmailTemplate({
          templateName: ctx.input.templateName!,
          subject: ctx.input.subject!,
          body: ctx.input.body!,
          plaintextBody: ctx.input.plaintextBody,
          preheader: ctx.input.preheader,
          tags: ctx.input.tags
        });
        return {
          output: {
            templateId: result.email_template_id,
            message: result.message
          },
          message: `Created email template **${ctx.input.templateName}** (ID: ${result.email_template_id}).`
        };
      }
      case 'update': {
        let result = await client.updateEmailTemplate({
          templateId: ctx.input.templateId!,
          templateName: ctx.input.templateName,
          subject: ctx.input.subject,
          body: ctx.input.body,
          plaintextBody: ctx.input.plaintextBody,
          preheader: ctx.input.preheader,
          tags: ctx.input.tags
        });
        return {
          output: {
            templateId: ctx.input.templateId,
            message: result.message
          },
          message: `Updated email template **${ctx.input.templateId}**.`
        };
      }
    }
  })
  .build();

export let manageContentBlocks = SlateTool.create(spec, {
  name: 'Manage Content Blocks',
  key: 'manage_content_blocks',
  description: `Create, retrieve, update, or list reusable email Content Blocks in Braze. Content Blocks are reusable HTML or text snippets that can be referenced across email templates and campaigns.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'update']).describe('Operation to perform'),
      contentBlockId: z
        .string()
        .optional()
        .describe('Content Block ID (required for get and update)'),
      name: z.string().optional().describe('Content Block name (required for create)'),
      contentType: z
        .enum(['html', 'text'])
        .optional()
        .describe('Content type: html or text (required for create)'),
      content: z.string().optional().describe('Content Block body (required for create)'),
      description: z.string().optional().describe('Description of the Content Block'),
      state: z
        .enum(['active', 'draft', 'archived'])
        .optional()
        .describe('Content Block state'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to associate with the Content Block'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Filter blocks modified after this timestamp (for list action)'),
      modifiedBefore: z
        .string()
        .optional()
        .describe('Filter blocks modified before this timestamp (for list action)'),
      limit: z.number().optional().describe('Max results to return (for list action)'),
      offset: z.number().optional().describe('Offset for pagination (for list action)')
    })
  )
  .output(
    z.object({
      contentBlocks: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of Content Blocks'),
      contentBlockId: z.string().optional().describe('Content Block ID'),
      name: z.string().optional().describe('Content Block name'),
      content: z.string().optional().describe('Content Block body'),
      contentType: z.string().optional().describe('Content type'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listContentBlocks({
          modifiedAfter: ctx.input.modifiedAfter,
          modifiedBefore: ctx.input.modifiedBefore,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        let contentBlocks = (result.content_blocks ?? []).map((b: any) => ({
          contentBlockId: b.content_block_id,
          name: b.name,
          contentType: b.content_type,
          tags: b.tags,
          createdAt: b.created_at,
          lastEdited: b.last_edited
        }));
        return {
          output: {
            contentBlocks,
            message: result.message
          },
          message: `Found **${contentBlocks.length}** Content Block(s).`
        };
      }
      case 'get': {
        let result = await client.getContentBlock(ctx.input.contentBlockId!);
        return {
          output: {
            contentBlockId: result.content_block_id,
            name: result.name,
            content: result.content,
            contentType: result.content_type,
            createdAt: result.created_at,
            updatedAt: result.last_edited,
            message: result.message
          },
          message: `Retrieved Content Block **${result.name ?? ctx.input.contentBlockId}**.`
        };
      }
      case 'create': {
        let result = await client.createContentBlock({
          name: ctx.input.name!,
          contentType: ctx.input.contentType!,
          content: ctx.input.content!,
          description: ctx.input.description,
          state: ctx.input.state,
          tags: ctx.input.tags
        });
        return {
          output: {
            contentBlockId: result.content_block_id,
            message: result.message
          },
          message: `Created Content Block **${ctx.input.name}** (ID: ${result.content_block_id}).`
        };
      }
      case 'update': {
        let result = await client.updateContentBlock({
          contentBlockId: ctx.input.contentBlockId!,
          name: ctx.input.name,
          contentType: ctx.input.contentType,
          content: ctx.input.content,
          description: ctx.input.description,
          state: ctx.input.state,
          tags: ctx.input.tags
        });
        return {
          output: {
            contentBlockId: ctx.input.contentBlockId,
            message: result.message
          },
          message: `Updated Content Block **${ctx.input.contentBlockId}**.`
        };
      }
    }
  })
  .build();
