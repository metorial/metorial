import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fieldSchema = z
  .object({
    name: z.string().describe('Field name'),
    type: z
      .string()
      .optional()
      .describe('Field type (e.g. text, signature, date, initials, checkbox)'),
    required: z.boolean().optional().describe('Whether field is required'),
    role: z.string().optional().describe('Submitter role assigned to this field')
  })
  .passthrough();

let documentSchema = z
  .object({
    name: z.string().optional().describe('Document name'),
    url: z.string().optional().describe('Document URL')
  })
  .passthrough();

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve detailed information about a specific document template including its fields, submitter roles, documents, and configuration. Useful for inspecting a template before creating a submission.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('Template ID'),
      name: z.string().describe('Template name'),
      slug: z.string().optional().describe('Template slug'),
      externalId: z.string().nullable().optional().describe('External ID'),
      folderName: z.string().nullable().optional().describe('Folder name'),
      fields: z.array(fieldSchema).describe('Template fields'),
      submitters: z
        .array(
          z
            .object({
              name: z.string().describe('Submitter role name'),
              uuid: z.string().optional().describe('Submitter role UUID')
            })
            .passthrough()
        )
        .describe('Submitter roles defined in the template'),
      documents: z.array(documentSchema).describe('Template documents'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last updated timestamp'),
      archivedAt: z.string().nullable().optional().describe('Archived timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let t = await client.getTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: t.id,
        name: t.name,
        slug: t.slug,
        externalId: t.external_id,
        folderName: t.folder_name,
        fields: t.fields || [],
        submitters: t.submitters || [],
        documents: t.documents || [],
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        archivedAt: t.archived_at
      },
      message: `Retrieved template **"${t.name}"** (ID: ${t.id}) with ${(t.fields || []).length} field(s) and ${(t.submitters || []).length} submitter role(s).`
    };
  })
  .build();
