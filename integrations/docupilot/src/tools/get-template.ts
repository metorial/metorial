import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve detailed information about a specific template including its merge field schema (tokens). Use this to understand the template's structure and the data fields required for document generation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to retrieve'),
      includeSchema: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include merge field schema (tokens) in the response')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('Unique template ID'),
      title: z.string().describe('Template title'),
      description: z.string().nullable().optional().describe('Template description'),
      type: z.string().describe('Template format type'),
      status: z.string().optional().describe('Document status (active or test)'),
      createdTime: z.string().describe('Template creation timestamp'),
      updatedTime: z.string().nullable().describe('Last update timestamp'),
      folderId: z.number().nullable().optional().describe('Folder ID'),
      folderName: z.string().nullable().optional().describe('Folder name'),
      preferences: z
        .object({
          outputType: z.string().optional().describe('Output format'),
          outputFileName: z.string().optional().describe('Custom output file name pattern'),
          password: z.string().nullable().optional().describe('PDF password protection'),
          format: z.string().optional().describe('Page format (A3, A4, Letter, etc.)'),
          orientation: z.string().optional().describe('Page orientation'),
          autoNumber: z.number().nullable().optional().describe('Auto-numbering counter')
        })
        .optional()
        .describe('Template output preferences'),
      schema: z
        .array(
          z.object({
            name: z.string().describe('Token/field name'),
            type: z.string().describe('Field data type'),
            children: z.array(z.any()).optional().describe('Nested fields for complex types')
          })
        )
        .optional()
        .describe('Merge field schema (tokens) for this template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let template = await client.getTemplate(ctx.input.templateId);

    let schema: any;
    if (ctx.input.includeSchema) {
      schema = await client.getTemplateSchema(ctx.input.templateId);
    }

    return {
      output: {
        templateId: template.id,
        title: template.title,
        description: template.description ?? null,
        type: template.type,
        status: template.document_status,
        createdTime: template.created_time,
        updatedTime: template.updated_time,
        folderId: template.folder?.id ?? null,
        folderName: template.folder?.name ?? null,
        preferences: template.preferences
          ? {
              outputType: template.preferences.output_type,
              outputFileName: template.preferences.output_file_name,
              password: template.preferences.password,
              format: template.preferences.format,
              orientation: template.preferences.orientation,
              autoNumber: template.preferences.auto_number
            }
          : undefined,
        schema
      },
      message: `Retrieved template **"${template.title}"** (ID: ${template.id}, type: ${template.type})${schema ? ` with ${schema.length} merge field(s)` : ''}.`
    };
  })
  .build();
