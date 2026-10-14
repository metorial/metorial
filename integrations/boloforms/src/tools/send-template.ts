import { SlateTool } from 'slates';
import { z } from 'zod';
import { BoloFormsClient } from '../lib/client';
import { spec } from '../spec';

export let sendTemplate = SlateTool.create(spec, {
  name: 'Send Template for Signing',
  key: 'send_template',
  description: `Send a PDF template or form template for signing to one or more recipients. Supports custom email subjects and messages per recipient, as well as custom template variables.`,
  constraints: [
    'Maximum of 100 recipients per request.',
    'For PDF templates, each receiver must include a roleTitle that matches the role configured in the template.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      signingType: z
        .enum(['PDF_TEMPLATE', 'FORM_TEMPLATE'])
        .describe('Type of template to send'),
      documentId: z.string().describe('ID of the template document to send'),
      receiversList: z
        .array(
          z.object({
            name: z.string().describe('Recipient name'),
            email: z.string().describe('Recipient email address'),
            roleTitle: z
              .string()
              .optional()
              .describe(
                'Role title matching the template configuration (required for PDF_TEMPLATE)'
              ),
            subject: z.string().optional().describe('Custom email subject for this recipient'),
            message: z.string().optional().describe('Custom email message for this recipient')
          })
        )
        .describe('List of recipients to send the template to'),
      subject: z.string().optional().describe('Default email subject for all recipients'),
      message: z.string().optional().describe('Default email message for all recipients'),
      customVariables: z
        .array(
          z.object({
            varName: z.string().describe('Variable name in the format [varName]'),
            varValue: z.string().describe('Value to substitute for the variable')
          })
        )
        .optional()
        .describe('Custom variables to pre-fill in the template')
    })
  )
  .output(
    z.object({
      message: z.string().optional().describe('Response message from the API'),
      templateId: z.string().optional().describe('ID of the template used'),
      createdDocumentId: z
        .string()
        .optional()
        .describe(
          'Respondent Mongo ObjectId; use as responseId for send_reminder or void_document with PDF_TEMPLATE'
        ),
      createdDocumentStatus: z.string().optional().describe('Status of the created document'),
      signers: z
        .array(
          z.object({
            signerId: z.string().optional(),
            email: z.string().optional(),
            name: z.string().optional(),
            status: z.string().optional(),
            roleTitle: z.string().optional(),
            sentUrl: z.string().optional()
          })
        )
        .optional()
        .describe('Signer details for PDF template responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BoloFormsClient({ token: ctx.auth.token });

    let mailData =
      ctx.input.subject || ctx.input.message
        ? { subject: ctx.input.subject, message: ctx.input.message }
        : undefined;

    let result =
      ctx.input.signingType === 'PDF_TEMPLATE'
        ? await client.sendPdfTemplate({
            documentId: ctx.input.documentId,
            receiversList: ctx.input.receiversList.map(r => ({
              name: r.name,
              email: r.email,
              roleTitle: r.roleTitle,
              message: r.message,
              subject: r.subject
            })),
            mailData,
            customVariables: ctx.input.customVariables
          })
        : await client.sendFormTemplate({
            documentId: ctx.input.documentId,
            receiversList: ctx.input.receiversList.map(r => ({
              name: r.name,
              email: r.email,
              message: r.message,
              subject: r.subject
            })),
            mailData,
            customVariables: ctx.input.customVariables
          });

    return {
      output: {
        message: result.message ?? undefined,
        templateId: result.templateId ?? undefined,
        createdDocumentId: result.createdDocumentId ?? undefined,
        createdDocumentStatus: result.createdDocumentStatus ?? undefined,
        signers: result.signers?.map(signer => ({
          signerId: signer.signerId ?? undefined,
          email: signer.email ?? undefined,
          name: signer.name ?? undefined,
          status: signer.status ?? undefined,
          roleTitle: signer.roleTitle ?? undefined,
          sentUrl: signer.sentUrl ?? undefined
        }))
      },
      message: `Sent **${ctx.input.signingType === 'PDF_TEMPLATE' ? 'PDF' : 'form'} template** to **${ctx.input.receiversList.length}** recipient(s).${result.createdDocumentId ? ` Created document ID: \`${result.createdDocumentId}\`` : ''}`
    };
  })
  .build();
