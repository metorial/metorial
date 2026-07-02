import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { boxServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageMetadata = SlateTool.create(spec, {
  name: 'Manage Metadata',
  key: 'manage_metadata',
  description: `Apply, view, update, or remove metadata on Box files. Metadata is based on templates that define typed fields. You can also list available metadata templates.`,
  instructions: [
    'Use scope "enterprise" for company-defined templates and "global" for Box-provided templates.',
    'When updating metadata, use JSON Patch operations: "add", "replace", "remove", "test", "move", "copy".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'apply',
          'get',
          'get_all',
          'update',
          'remove',
          'list_templates',
          'get_template'
        ])
        .describe('The metadata operation to perform'),
      fileId: z
        .string()
        .optional()
        .describe('File ID (required for apply, get, get_all, update, remove)'),
      scope: z
        .string()
        .optional()
        .describe(
          'Metadata template scope: "enterprise" or "global" (required for apply, get, update, remove, list_templates, get_template)'
        ),
      templateKey: z
        .string()
        .optional()
        .describe(
          'Metadata template key (required for apply, get, update, remove, get_template)'
        ),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata key-value pairs to apply (for apply action)'),
      operations: z
        .array(
          z.object({
            op: z
              .enum(['add', 'replace', 'remove', 'test', 'move', 'copy'])
              .describe('Patch operation type'),
            path: z.string().describe('JSON Pointer path to the field, e.g. "/fieldName"'),
            value: z.any().optional().describe('Value for add/replace/test operations')
          })
        )
        .optional()
        .describe('JSON Patch operations for updating metadata')
    })
  )
  .output(
    z.object({
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Applied or retrieved metadata key-value pairs'),
      metadataEntries: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('All metadata instances on the file'),
      templates: z
        .array(
          z.object({
            templateKey: z.string(),
            displayName: z.string().optional(),
            scope: z.string().optional(),
            fields: z
              .array(
                z.object({
                  key: z.string(),
                  type: z.string(),
                  displayName: z.string().optional()
                })
              )
              .optional()
          })
        )
        .optional()
        .describe('Available metadata templates'),
      template: z
        .object({
          templateKey: z.string(),
          displayName: z.string().optional(),
          scope: z.string().optional(),
          fields: z
            .array(
              z.object({
                key: z.string(),
                type: z.string(),
                displayName: z.string().optional(),
                description: z.string().optional()
              })
            )
            .optional()
        })
        .optional()
        .describe('Metadata template details'),
      removed: z.boolean().optional().describe('True if metadata was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, fileId, scope, templateKey, metadata, operations } = ctx.input;

    if (action === 'list_templates') {
      if (!scope) throw boxServiceError('scope is required for list_templates action');
      let templates = await client.getMetadataTemplates(scope);
      let mapped = templates.map((t: any) => ({
        templateKey: t.templateKey,
        displayName: t.displayName,
        scope: t.scope,
        fields: t.fields?.map((f: any) => ({
          key: f.key,
          type: f.type,
          displayName: f.displayName
        }))
      }));
      return {
        output: { templates: mapped },
        message: `Found ${mapped.length} metadata template(s) in scope "${scope}".`
      };
    }

    if (action === 'get_template') {
      if (!scope || !templateKey)
        throw boxServiceError('scope and templateKey are required for get_template action');
      let tmpl = await client.getMetadataTemplate(scope, templateKey);
      return {
        output: {
          template: {
            templateKey: tmpl.templateKey,
            displayName: tmpl.displayName,
            scope: tmpl.scope,
            fields: tmpl.fields?.map((f: any) => ({
              key: f.key,
              type: f.type,
              displayName: f.displayName,
              description: f.description
            }))
          }
        },
        message: `Retrieved metadata template **${tmpl.displayName || templateKey}** in scope "${scope}".`
      };
    }

    if (!fileId) throw boxServiceError('fileId is required for this action');

    if (action === 'get_all') {
      let entries = await client.getAllFileMetadata(fileId);
      return {
        output: { metadataEntries: entries },
        message: `Found ${entries.length} metadata instance(s) on file ${fileId}.`
      };
    }

    if (!scope || !templateKey)
      throw boxServiceError('scope and templateKey are required for this action');

    if (action === 'get') {
      let md = await client.getFileMetadata(fileId, scope, templateKey);
      return {
        output: { metadata: md },
        message: `Retrieved metadata template "${templateKey}" on file ${fileId}.`
      };
    }

    if (action === 'apply') {
      if (!metadata) throw boxServiceError('metadata is required for apply action');
      let md = await client.applyFileMetadata(fileId, scope, templateKey, metadata);
      return {
        output: { metadata: md },
        message: `Applied metadata template "${templateKey}" to file ${fileId}.`
      };
    }

    if (action === 'update') {
      if (!operations) throw boxServiceError('operations are required for update action');
      let md = await client.updateFileMetadata(fileId, scope, templateKey, operations);
      return {
        output: { metadata: md },
        message: `Updated metadata template "${templateKey}" on file ${fileId}.`
      };
    }

    // remove
    await client.deleteFileMetadata(fileId, scope, templateKey);
    return {
      output: { removed: true },
      message: `Removed metadata template "${templateKey}" from file ${fileId}.`
    };
  });
