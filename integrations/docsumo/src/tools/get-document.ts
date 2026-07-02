import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve detailed information about a specific document including its processing status, metadata, review URL, and upload details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('Unique identifier of the document')
    })
  )
  .output(
    z.object({
      docId: z.string().describe('Unique document identifier'),
      title: z.string().describe('Document filename'),
      status: z.string().describe('Processing status'),
      type: z.string().describe('Document type identifier'),
      typeTitle: z.string().optional().describe('Human-readable document type name'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      createdAtIso: z.string().optional().describe('Creation timestamp in ISO 8601'),
      modifiedAtIso: z.string().optional().describe('Last modified timestamp in ISO 8601'),
      email: z.string().optional().describe('Email of the uploader'),
      reviewUrl: z.string().optional().describe('URL to review the document'),
      userDocId: z.string().optional().describe('User-defined document ID'),
      docMetaData: z.string().optional().describe('Custom metadata'),
      folderId: z.string().optional().describe('Folder ID'),
      folderName: z.string().optional().describe('Folder name'),
      approvedWithError: z
        .boolean()
        .optional()
        .describe('Whether the document was approved with errors'),
      uploadedBy: z
        .object({
          userId: z.string(),
          email: z.string(),
          fullName: z.string(),
          avatarUrl: z.string().optional()
        })
        .optional()
        .describe('User who uploaded the document'),
      timeDict: z
        .object({
          processingTime: z.number(),
          totalTime: z.number()
        })
        .optional()
        .describe('Processing time information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let doc = await client.getDocumentDetail(ctx.input.docId);

    return {
      output: doc,
      message: `Document **${doc.title}** (${doc.docId}) — Status: **${doc.status}**, Type: ${doc.typeTitle || doc.type}.`
    };
  })
  .build();
