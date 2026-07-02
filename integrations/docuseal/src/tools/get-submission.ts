import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubmission = SlateTool.create(spec, {
  name: 'Get Submission',
  key: 'get_submission',
  description: `Retrieve detailed information about a specific submission including all submitters, their statuses, filled field values, signed document URLs, and the audit log. Optionally retrieve and merge all signed documents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      submissionId: z.number().describe('ID of the submission to retrieve'),
      mergeDocuments: z
        .boolean()
        .optional()
        .describe('Set true to also fetch documents merged into a single PDF')
    })
  )
  .output(
    z.object({
      submissionId: z.number().describe('Submission ID'),
      slug: z.string().optional().describe('Submission slug'),
      status: z.string().optional().describe('Submission status'),
      source: z.string().optional().describe('Submission source'),
      completedAt: z.string().nullable().optional().describe('Completion timestamp'),
      expireAt: z.string().nullable().optional().describe('Expiration timestamp'),
      createdAt: z.string().describe('Creation timestamp'),
      auditLogUrl: z.string().nullable().optional().describe('Audit log PDF URL'),
      combinedDocumentUrl: z
        .string()
        .nullable()
        .optional()
        .describe('Combined document + audit log URL'),
      submitters: z
        .array(
          z.object({
            submitterId: z.number().describe('Submitter ID'),
            email: z.string().optional().describe('Submitter email'),
            name: z.string().nullable().optional().describe('Submitter name'),
            phone: z.string().nullable().optional().describe('Submitter phone'),
            status: z.string().optional().describe('Submitter status'),
            role: z.string().optional().describe('Submitter role'),
            completedAt: z.string().nullable().optional().describe('Completion timestamp'),
            declinedAt: z.string().nullable().optional().describe('Declined timestamp'),
            values: z
              .array(
                z.object({
                  field: z.string().describe('Field name'),
                  value: z.any().describe('Field value')
                })
              )
              .optional()
              .describe('Filled field values'),
            documents: z
              .array(
                z.object({
                  name: z.string().optional().describe('Document name'),
                  url: z.string().optional().describe('Signed document download URL')
                })
              )
              .optional()
              .describe('Signed documents')
          })
        )
        .describe('Submitters with their details'),
      template: z
        .object({
          templateId: z.number().optional().describe('Template ID'),
          name: z.string().optional().describe('Template name')
        })
        .optional()
        .describe('Source template'),
      mergedDocuments: z
        .array(
          z.object({
            name: z.string().optional().describe('Document name'),
            url: z.string().optional().describe('Merged document URL')
          })
        )
        .optional()
        .describe('Merged documents (when mergeDocuments is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let s = await client.getSubmission(ctx.input.submissionId);

    let mergedDocuments: Array<{ name?: string; url?: string }> | undefined;
    if (ctx.input.mergeDocuments) {
      let docs = await client.getSubmissionDocuments(ctx.input.submissionId, true);
      mergedDocuments = (docs.documents || []).map((d: any) => ({
        name: d.name,
        url: d.url
      }));
    }

    let submitters = (s.submitters || []).map((sub: any) => ({
      submitterId: sub.id,
      email: sub.email,
      name: sub.name,
      phone: sub.phone,
      status: sub.status,
      role: sub.role,
      completedAt: sub.completed_at,
      declinedAt: sub.declined_at,
      values: sub.values || [],
      documents: (sub.documents || []).map((d: any) => ({
        name: d.name,
        url: d.url
      }))
    }));

    return {
      output: {
        submissionId: s.id,
        slug: s.slug,
        status: s.status,
        source: s.source,
        completedAt: s.completed_at,
        expireAt: s.expire_at,
        createdAt: s.created_at,
        auditLogUrl: s.audit_log_url,
        combinedDocumentUrl: s.combined_document_url,
        submitters,
        template: s.template
          ? {
              templateId: s.template.id,
              name: s.template.name
            }
          : undefined,
        mergedDocuments
      },
      message: `Retrieved submission **${s.id}** (status: ${s.status || 'unknown'}) with ${submitters.length} submitter(s).`
    };
  })
  .build();
