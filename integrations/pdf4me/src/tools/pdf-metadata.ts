import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPdfMetadata = SlateTool.create(spec, {
  name: 'Get PDF Metadata',
  key: 'get_pdf_metadata',
  description: `Retrieve metadata from a PDF document including title, author, page count, creation date, encryption status, PDF version, compliance level, and whether the document is signed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension')
    })
  )
  .output(
    z.object({
      title: z.string().describe('Document title'),
      subject: z.string().describe('Document subject'),
      pageCount: z.string().describe('Number of pages'),
      author: z.string().describe('Document author'),
      size: z.string().describe('Document size'),
      creator: z.string().describe('Document creator application'),
      producer: z.string().describe('PDF producer'),
      creationDate: z.string().describe('Document creation date'),
      modificationDate: z.string().describe('Document last modification date'),
      isEncrypted: z.boolean().describe('Whether the document is password protected'),
      isLinearized: z.boolean().describe('Whether the document is optimized for web viewing'),
      pdfCompliance: z.string().describe('PDF compliance level (e.g. PDF/A-1b)'),
      isSigned: z.boolean().describe('Whether the document has digital signatures'),
      pdfVersion: z.string().describe('PDF version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getPdfMetadata({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName
    });

    let output = {
      title: result.Title ?? '',
      subject: result.Subject ?? '',
      pageCount: result.PageCount ?? '',
      author: result.Author ?? '',
      size: result.Size ?? '',
      creator: result.Creator ?? '',
      producer: result.Producer ?? '',
      creationDate: result.CreationDate ?? '',
      modificationDate: result.ModDate ?? '',
      isEncrypted: result.IsEncrypted ?? false,
      isLinearized: result.IsLinearized ?? false,
      pdfCompliance: result.PdfCompliance ?? '',
      isSigned: result.IsSigned ?? false,
      pdfVersion: result.PdfVersion ?? ''
    };

    return {
      output,
      message: `PDF metadata for **${ctx.input.fileName}**: ${output.pageCount} pages, version ${output.pdfVersion}${output.isEncrypted ? ', encrypted' : ''}${output.isSigned ? ', signed' : ''}`
    };
  })
  .build();
