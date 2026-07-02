import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a new document template from a PDF, DOCX, or HTML source.
For **PDF** and **DOCX**: provide document files as base64-encoded strings or downloadable URLs. PDF templates support text field tags like \`{{Field Name;role=Signer1;type=date}}\` or pixel-coordinate field definitions.
For **HTML**: provide raw HTML content with field tags like \`<text-field>\`, \`<signature-field>\`, etc.`,
  instructions: [
    'Choose exactly one source type: "pdf", "docx", or "html".',
    'For PDF/DOCX, provide documents as base64-encoded content or publicly accessible URLs.',
    'For HTML, provide the html content directly.'
  ]
})
  .input(
    z.object({
      sourceType: z.enum(['pdf', 'docx', 'html']).describe('Source document type'),
      name: z.string().describe('Template name'),
      documents: z
        .array(
          z.object({
            name: z.string().optional().describe('Document name'),
            file: z
              .string()
              .optional()
              .describe('Base64-encoded file content or URL (for PDF/DOCX)'),
            html: z.string().optional().describe('HTML content (for HTML source type)'),
            fields: z
              .array(z.record(z.string(), z.any()))
              .optional()
              .describe('Field definitions with coordinates')
          })
        )
        .optional()
        .describe('Documents array (required for PDF/DOCX)'),
      html: z
        .string()
        .optional()
        .describe('HTML content (for HTML source type, single document)'),
      htmlHeader: z.string().optional().describe('HTML header for all pages (HTML type only)'),
      htmlFooter: z.string().optional().describe('HTML footer for all pages (HTML type only)'),
      size: z.string().optional().describe('Page size, e.g. "Letter", "A4" (HTML type only)'),
      folderName: z.string().optional().describe('Folder to organize the template into'),
      externalId: z.string().optional().describe('External ID for mapping to your system'),
      sharedLink: z
        .boolean()
        .optional()
        .describe('Make template publicly accessible via link'),
      flatten: z.boolean().optional().describe('Remove PDF form fields (PDF only)'),
      removeTags: z
        .boolean()
        .optional()
        .describe('Remove {{text}} tags from PDF (PDF only, default true)')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('Created template ID'),
      name: z.string().describe('Template name'),
      slug: z.string().optional().describe('Template slug'),
      externalId: z.string().nullable().optional().describe('External ID'),
      folderName: z.string().nullable().optional().describe('Folder name'),
      fields: z.array(z.any()).describe('Template fields'),
      documents: z.array(z.any()).describe('Template documents'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result: any;

    if (ctx.input.sourceType === 'pdf') {
      let docs = (ctx.input.documents || []).map(d => ({
        name: d.name || 'document',
        file: d.file || '',
        fields: d.fields
      }));
      result = await client.createTemplatePdf({
        name: ctx.input.name,
        documents: docs,
        folderName: ctx.input.folderName,
        externalId: ctx.input.externalId,
        sharedLink: ctx.input.sharedLink,
        flatten: ctx.input.flatten,
        removeTags: ctx.input.removeTags
      });
    } else if (ctx.input.sourceType === 'docx') {
      let docs = (ctx.input.documents || []).map(d => ({
        name: d.name || 'document',
        file: d.file || '',
        fields: d.fields
      }));
      result = await client.createTemplateDocx({
        name: ctx.input.name,
        documents: docs,
        folderName: ctx.input.folderName,
        externalId: ctx.input.externalId,
        sharedLink: ctx.input.sharedLink
      });
    } else {
      let htmlDocs = ctx.input.documents?.map(d => ({
        html: d.html || '',
        name: d.name
      }));
      result = await client.createTemplateHtml({
        html: ctx.input.html || '',
        htmlHeader: ctx.input.htmlHeader,
        htmlFooter: ctx.input.htmlFooter,
        name: ctx.input.name,
        size: ctx.input.size,
        externalId: ctx.input.externalId,
        folderName: ctx.input.folderName,
        sharedLink: ctx.input.sharedLink,
        documents: htmlDocs
      });
    }

    return {
      output: {
        templateId: result.id,
        name: result.name,
        slug: result.slug,
        externalId: result.external_id,
        folderName: result.folder_name,
        fields: result.fields || [],
        documents: result.documents || [],
        createdAt: result.created_at
      },
      message: `Created template **"${result.name}"** (ID: ${result.id}) from ${ctx.input.sourceType.toUpperCase()} source.`
    };
  })
  .build();
