import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  conversationIdSchema,
  documentIdSchema,
  documentSchema,
  folderIdSchema,
  pageSchema,
  paginationSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `Retrieve knowledge base documents. Filter by folder, conversation (focus mode documents), or search by keyword.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: folderIdSchema.optional(),
      conversationId: conversationIdSchema.optional(),
      keyword: z.string().optional().describe('Search documents by partial name match'),
      page: pageSchema
    })
  )
  .output(
    z.object({
      documents: z.array(documentSchema),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listDocuments({
      folderId: ctx.input.folderId,
      conversationId: ctx.input.conversationId,
      keyword: ctx.input.keyword,
      page: ctx.input.page
    });

    return {
      output: result,
      message: `Found **${result.documents.length}** document(s)${result.pagination.total > result.documents.length ? ` (${result.pagination.total} total)` : ''}.`
    };
  });

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve a knowledge base document's learning status and content URL. Call list_documents to discover document IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: documentIdSchema
    })
  )
  .output(documentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let doc = await client.getDocument(ctx.input.documentId);

    return {
      output: doc,
      message: `Retrieved document **${doc.name}** (status: ${doc.status}).`
    };
  });

export let createDocumentFromContent = SlateTool.create(spec, {
  name: 'Create Document from Content',
  key: 'create_document_from_content',
  description: `Create a knowledge base document from text or HTML content. Call list_folders to discover the target folder. Structured HTML with headings and paragraphs yields best results for the AI.`,
  constraints: [
    'Content must be 768 KB or less. For larger content, upload as a file instead.'
  ]
})
  .input(
    z.object({
      name: z.string().min(1).describe('Name for the document'),
      folderId: folderIdSchema.optional(),
      content: z.string().describe('Text or HTML content for the document (up to 768 KB)')
    })
  )
  .output(documentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let doc = await client.createDocumentFromContent({
      name: ctx.input.name,
      folderId: ctx.input.folderId,
      content: ctx.input.content
    });

    return {
      output: doc,
      message: `Created document **${doc.name}** (status: ${doc.status}). It will be available once syncing completes.`
    };
  });

export let createDocumentFromWebpage = SlateTool.create(spec, {
  name: 'Create Document from Webpage',
  key: 'create_document_from_webpage',
  description: `Create a knowledge base document by crawling a publicly accessible webpage URL. Call list_folders to discover the target folder. Cody will ingest the page content automatically.`,
  constraints: ['The webpage must be publicly accessible without login.']
})
  .input(
    z.object({
      folderId: folderIdSchema,
      url: z
        .url()
        .refine(
          value => ['http:', 'https:'].includes(new URL(value).protocol),
          'Use an HTTP or HTTPS webpage URL.'
        )
        .describe('Publicly accessible webpage URL to crawl')
    })
  )
  .output(documentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let doc = await client.createDocumentFromWebpage({
      folderId: ctx.input.folderId,
      url: ctx.input.url
    });

    return {
      output: doc,
      message: `Created document **${doc.name}** from webpage. Status: ${doc.status}.`
    };
  });

export let getUploadUrl = SlateTool.create(spec, {
  name: 'Get File Upload URL',
  key: 'get_upload_url',
  description: `Get a signed file upload URL for uploading a file to the knowledge base. Returns a URL for uploading via PUT and a key to use when creating a document from the uploaded file.`,
  instructions: [
    'After obtaining the URL, upload the file via a PUT request to the returned URL with the correct Content-Type header.',
    'Then use the returned key with the "Create Document from File" tool to create the document.'
  ],
  constraints: [
    'Supported formats: txt, md, rtf, pdf, ppt, pptx, pptm, doc, docx, docm.',
    'Maximum file size: 100 MB.'
  ]
})
  .input(
    z.object({
      fileName: z
        .string()
        .regex(
          /\.(txt|md|rtf|pdf|ppt|pptx|pptm|doc|docx|docm)$/i,
          'Use a supported file extension.'
        )
        .describe('File name with extension (e.g. "report.pdf")'),
      contentType: z
        .string()
        .min(1)
        .describe('MIME content type of the file (e.g. "application/pdf")')
    })
  )
  .output(
    z.object({
      uploadUrl: z.string().describe('Signed URL for uploading the file via PUT request'),
      key: z
        .string()
        .min(1)
        .describe('Key to reference the uploaded file when creating a document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSignedUploadUrl({
      fileName: ctx.input.fileName,
      contentType: ctx.input.contentType
    });

    return {
      output: {
        uploadUrl: result.url,
        key: result.key
      },
      message: `Generated upload URL for **${ctx.input.fileName}**. Upload the file to the URL via PUT, then use the key \`${result.key}\` to create the document.`
    };
  });

export let createDocumentFromFile = SlateTool.create(spec, {
  name: 'Create Document from File',
  key: 'create_document_from_file',
  description: `Create a knowledge base document from a previously uploaded file. Requires a key obtained from the "Get File Upload URL" tool after uploading the file.`,
  instructions: [
    'First use "Get File Upload URL" to get a signed URL and upload your file.',
    'Then pass the returned key to this tool along with the target folder ID.'
  ],
  constraints: ['File conversion can take from a couple of minutes to up to an hour.']
})
  .input(
    z.object({
      folderId: folderIdSchema,
      key: z.string().min(1).describe('Upload key from the signed URL endpoint')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the document creation was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.createDocumentFromFile({
      folderId: ctx.input.folderId,
      key: ctx.input.key
    });

    return {
      output: { success: true },
      message: `Document creation from file accepted. The document will appear once file conversion completes (may take several minutes).`
    };
  });

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Permanently delete a knowledge base document. Call list_documents to discover document IDs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: documentIdSchema
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the document was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteDocument(ctx.input.documentId);

    return {
      output: { success: true },
      message: `Document \`${ctx.input.documentId}\` deleted successfully.`
    };
  });
