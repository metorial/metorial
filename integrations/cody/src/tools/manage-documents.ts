import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let documentSchema = z.object({
  documentId: z.string().describe('Unique document identifier'),
  name: z.string().describe('Document name'),
  status: z.string().describe('Sync status: syncing, synced, or sync_failed'),
  contentUrl: z.string().describe('URL to download the content as HTML'),
  folderId: z.string().describe('ID of the folder containing this document'),
  createdAt: z.number().describe('Unix timestamp of creation in seconds')
});

let paginationSchema = z.object({
  count: z.number(),
  total: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
  nextPage: z.number().nullable(),
  previousPage: z.number().nullable()
});

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
      folderId: z.string().optional().describe('Filter by folder ID'),
      conversationId: z
        .string()
        .optional()
        .describe('Filter to documents focused on a specific conversation'),
      keyword: z.string().optional().describe('Search documents by partial name match'),
      page: z.number().optional().describe('Page number for pagination')
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
  description: `Retrieve details of a specific knowledge base document including its sync status and content URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to retrieve')
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
  description: `Create a new knowledge base document from text or HTML content. Structured HTML with headings and paragraphs yields best results for the AI.`,
  constraints: [
    'Content must be 768 KB or less. For larger content, upload as a file instead.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name for the document'),
      folderId: z.string().optional().describe('Folder ID to place the document in'),
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
  description: `Create a new knowledge base document by crawling a publicly accessible webpage URL. Cody will ingest the page content automatically.`,
  constraints: ['The webpage must be publicly accessible without login.']
})
  .input(
    z.object({
      folderId: z.string().describe('Folder ID to place the document in'),
      url: z.string().describe('Publicly accessible webpage URL to crawl')
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
  description: `Get a signed S3 upload URL for uploading a file to the knowledge base. Returns a URL for uploading via PUT and a key to use when creating a document from the uploaded file.`,
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
      fileName: z.string().describe('File name with extension (e.g. "report.pdf")'),
      contentType: z
        .string()
        .describe('MIME content type of the file (e.g. "application/pdf")')
    })
  )
  .output(
    z.object({
      uploadUrl: z.string().describe('Signed S3 URL for uploading the file via PUT request'),
      key: z.string().describe('Key to reference the uploaded file when creating a document')
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
      folderId: z.string().describe('Folder ID to place the document in'),
      key: z.string().describe('Upload key from the signed URL endpoint')
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
  description: `Permanently delete a knowledge base document.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to delete')
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
