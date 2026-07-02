import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let documentSchema = z.object({
  docId: z.string().describe('Unique document identifier'),
  title: z.string().describe('Document filename'),
  status: z.string().describe('Processing status of the document'),
  type: z.string().describe('Document type identifier'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  email: z.string().optional().describe('Email of the uploader'),
  reviewUrl: z.string().optional().describe('URL to review the document in Docsumo'),
  userDocId: z.string().optional().describe('User-defined document ID'),
  docMetaData: z.string().optional().describe('Custom metadata attached to the document')
});

export let uploadDocument = SlateTool.create(spec, {
  name: 'Upload Document',
  key: 'upload_document',
  description: `Upload a document to Docsumo for AI-powered data extraction. Supports uploading from a public URL or base64-encoded content. The document will be processed using pre-trained AI models for the specified document type. Supported file types: JPG, JPEG, PNG, TIFF, PDF.`,
  instructions: [
    'You must specify a valid document type (e.g., "invoice", "bank_statements", "passport_front"). Use the "List Document Types" tool to get available types.',
    'When uploading via base64, the filename parameter is required and must include the file extension.'
  ],
  constraints: [
    'Maximum 10 requests per second.',
    'Supported file types: .jpg, .jpeg, .png, .tiff, .tif, .pdf.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      source: z.enum(['url', 'base64']).describe('Upload source type'),
      fileUrl: z
        .string()
        .optional()
        .describe('Public URL of the file to upload. Required when source is "url".'),
      base64Content: z
        .string()
        .optional()
        .describe('Base64-encoded file content. Required when source is "base64".'),
      filename: z
        .string()
        .optional()
        .describe(
          'Filename with extension. Required when source is "base64", optional for URL uploads.'
        ),
      documentType: z
        .string()
        .describe(
          'Document type for processing (e.g., "invoice", "bank_statements", "passport_front")'
        ),
      userDocId: z.string().optional().describe('Custom identifier for internal tracking'),
      docMetaData: z
        .string()
        .optional()
        .describe('JSON string with additional metadata to attach to the document'),
      generateReviewUrl: z
        .boolean()
        .optional()
        .describe('If true, includes a temporary review URL in the response'),
      password: z.string().optional().describe('Password for password-protected documents')
    })
  )
  .output(
    z.object({
      documents: z.array(documentSchema).describe('Uploaded document(s)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let documents: any;

    if (ctx.input.source === 'url') {
      if (!ctx.input.fileUrl) {
        throw new Error('fileUrl is required when source is "url"');
      }
      documents = await client.uploadFromUrl({
        fileUrl: ctx.input.fileUrl,
        documentType: ctx.input.documentType,
        userDocId: ctx.input.userDocId,
        docMetaData: ctx.input.docMetaData,
        reviewToken: ctx.input.generateReviewUrl,
        filename: ctx.input.filename,
        password: ctx.input.password
      });
    } else {
      if (!ctx.input.base64Content) {
        throw new Error('base64Content is required when source is "base64"');
      }
      if (!ctx.input.filename) {
        throw new Error('filename is required when source is "base64"');
      }
      documents = await client.uploadFromBase64({
        base64Content: ctx.input.base64Content,
        documentType: ctx.input.documentType,
        filename: ctx.input.filename,
        userDocId: ctx.input.userDocId,
        docMetaData: ctx.input.docMetaData,
        reviewToken: ctx.input.generateReviewUrl,
        password: ctx.input.password
      });
    }

    let docCount = documents.length;

    return {
      output: { documents },
      message: `Uploaded ${docCount} document(s) as type **${ctx.input.documentType}**. ${documents.map((d: any) => `Document **${d.title}** (${d.docId}) is now in status: ${d.status}.`).join(' ')}`
    };
  })
  .build();
