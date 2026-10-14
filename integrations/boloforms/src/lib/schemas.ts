import { z } from 'zod';

export let documentActionInputSchema = z.object({
  documentId: z
    .string()
    .min(1)
    .max(128)
    .describe('Public document UUID; use list_documents to find documents and templates'),
  documentType: z
    .enum(['PDF', 'PDF_TEMPLATE'])
    .optional()
    .describe(
      'Defaults to PDF when responseId is omitted and PDF_TEMPLATE when responseId is supplied'
    ),
  responseId: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .optional()
    .describe(
      'Required for PDF_TEMPLATE; use createdDocumentId from send_template or respondentDocumentId from get_template_respondents. Omit for PDF.'
    )
});

export let documentActionOutputSchema = z.object({
  message: z.string().nullish(),
  documentId: z.string().nullish(),
  documentType: z.enum(['PDF', 'PDF_TEMPLATE']).nullish(),
  responseId: z.string().nullish()
});
