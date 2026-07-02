import { SlateTool } from 'slates';
import { z } from 'zod';
import { EagleDocClient } from '../lib/client';
import { spec } from '../spec';

export let processAnyDocument = SlateTool.create(spec, {
  name: 'Process Any Document',
  key: 'process_any_document',
  description: `Extract structured data from any document type using OCR. Supports bank statements, travel tickets, passports, business cards, ID cards, driving licenses, birth certificates, delivery sheets, resumes, and more.

Each document type returns type-specific structured fields (e.g., bank statements return account details and transaction lists; resumes return work experience, education, and skills). You can specify a document type for targeted extraction or let the API auto-classify.`,
  instructions: [
    'Provide the document as a base64-encoded file with its original file name.',
    'Specify a docType for targeted extraction, or omit it to let the API auto-classify the document.',
    'Use configId for custom extraction configurations provided by the Eagle Doc team.'
  ],
  constraints: [
    'Supported file formats: PDF, PNG, JPG/JPEG, TIF/TIFF.',
    'Each page counts as one API request toward your quota.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileBase64: z.string().describe('Base64-encoded document file content'),
      fileName: z
        .string()
        .describe('Original file name with extension (e.g., "passport.jpg", "resume.pdf")'),
      docType: z
        .enum([
          'BankStatement',
          'TravelTicket',
          'Passport',
          'BusinessCard',
          'EmployeeIDCard',
          'StudentIDCard',
          'DrivingLicense',
          'BirthCertificate',
          'DeliverySheet',
          'Resume'
        ])
        .optional()
        .describe('Document type for targeted extraction. Omit to let the API auto-classify.'),
      configId: z
        .string()
        .optional()
        .describe(
          'Custom extraction configuration ID provided by Eagle Doc for specialized extraction rules'
        ),
      privacy: z
        .boolean()
        .optional()
        .describe('When true, the file is not stored on the server. Defaults to true.')
    })
  )
  .output(
    z.object({
      docType: z.string().optional().describe('Detected or specified document type'),
      general: z
        .record(z.string(), z.any())
        .optional()
        .describe('General extracted key-value fields specific to the document type'),
      lists: z
        .record(z.string(), z.array(z.record(z.string(), z.any())))
        .optional()
        .describe(
          'Extracted lists (e.g., TransactionList for bank statements, EducationList for resumes)'
        ),
      processingInfo: z
        .object({
          language: z.string().optional(),
          version: z.string().optional(),
          fileHash: z.string().optional(),
          duration: z.string().optional(),
          numberOfPages: z.string().optional(),
          docType: z.string().optional()
        })
        .passthrough()
        .optional()
        .describe('Processing metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EagleDocClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Processing document...');

    let result = await client.processAnyDocument({
      fileBase64: ctx.input.fileBase64,
      fileName: ctx.input.fileName,
      privacy: ctx.input.privacy,
      docType: ctx.input.docType,
      configId: ctx.input.configId
    });

    let docType = result.docType || ctx.input.docType || 'Unknown';
    let listNames = result.lists ? Object.keys(result.lists) : [];
    let generalFieldCount = result.general ? Object.keys(result.general).length : 0;

    let messageParts = [`**${docType}** processed successfully.`];
    if (generalFieldCount > 0) messageParts.push(`${generalFieldCount} field(s) extracted.`);
    if (listNames.length > 0) messageParts.push(`Lists: ${listNames.join(', ')}.`);

    return {
      output: result,
      message: messageParts.join(' ')
    };
  })
  .build();
