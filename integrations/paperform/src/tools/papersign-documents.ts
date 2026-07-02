import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let signerSchema = z.object({
  key: z.string().describe('Unique signer key'),
  name: z.string().describe('Signer name'),
  email: z.string().describe('Signer email'),
  phone: z.string().optional().describe('Signer phone number'),
  jobTitle: z.string().optional().describe('Signer job title'),
  company: z.string().optional().describe('Signer company')
});

let variableSchema = z.object({
  key: z.string().describe('Variable key'),
  name: z.string().describe('Variable display name'),
  value: z.string().describe('Variable value')
});

let documentOutputSchema = z.object({
  documentId: z.string().describe('Unique document ID'),
  name: z.string().describe('Document name'),
  status: z
    .string()
    .describe(
      'Document status (draft, inProgress, completed, cancelled, expired, rejected, archived)'
    ),
  folderName: z.string().nullable().describe('Folder name containing the document'),
  folderId: z.number().nullable().describe('Folder ID'),
  spaceName: z.string().nullable().describe('Space name'),
  spaceId: z.number().nullable().describe('Space ID'),
  signers: z
    .array(
      z.object({
        key: z.string().describe('Signer key'),
        name: z.string().describe('Signer name'),
        email: z.string().describe('Signer email')
      })
    )
    .describe('Document signers'),
  variables: z.array(variableSchema).describe('Document variables'),
  createdAt: z.string().describe('Creation timestamp (UTC)'),
  updatedAt: z.string().describe('Last update timestamp (UTC)'),
  sentAt: z.string().nullable().describe('Sent timestamp (UTC)'),
  completedAt: z.string().nullable().describe('Completion timestamp (UTC)')
});

let mapDocument = (d: Awaited<ReturnType<Client['getPapersignDocument']>>) => ({
  documentId: d.id,
  name: d.name,
  status: d.status,
  folderName: d.folder?.name ?? null,
  folderId: d.folder?.id ?? null,
  spaceName: d.space?.name ?? null,
  spaceId: d.space?.id ?? null,
  signers: d.signers.map(s => ({ key: s.key, name: s.name, email: s.email })),
  variables: d.variables,
  createdAt: d.created_at_utc,
  updatedAt: d.updated_at_utc,
  sentAt: d.sent_at_utc,
  completedAt: d.completed_at_utc
});

export let listPapersignDocuments = SlateTool.create(spec, {
  name: 'List Papersign Documents',
  key: 'list_papersign_documents',
  description: `List Papersign eSignature documents. Filter by folder, space, status, or search by name. Returns document details including signers, status, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search documents by name'),
      folderId: z.string().optional().describe('Filter by folder ID'),
      spaceId: z.string().optional().describe('Filter by space ID'),
      status: z
        .array(
          z.enum([
            'draft',
            'inProgress',
            'archived',
            'canceled',
            'expired',
            'rejected',
            'completed'
          ])
        )
        .optional()
        .describe('Filter by document status'),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (max 100, default 20)'),
      skip: z.number().optional().describe('Number of results to skip'),
      sort: z.enum(['ASC', 'DESC']).optional().describe('Sort direction by creation date')
    })
  )
  .output(
    z.object({
      documents: z.array(documentOutputSchema),
      total: z.number().describe('Total number of documents'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPapersignDocuments({
      search: ctx.input.search,
      folderId: ctx.input.folderId,
      spaceId: ctx.input.spaceId,
      status: ctx.input.status,
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      sort: ctx.input.sort
    });

    let documents = result.results.map(mapDocument);

    return {
      output: { documents, total: result.total, hasMore: result.has_more },
      message: `Found **${result.total}** document(s). Returned **${documents.length}** result(s).`
    };
  })
  .build();

export let getPapersignDocument = SlateTool.create(spec, {
  name: 'Get Papersign Document',
  key: 'get_papersign_document',
  description: `Retrieve detailed information about a specific Papersign document by its ID. Returns full document details including signers, variables, folder/space info, and all timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('The unique document ID')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let d = await client.getPapersignDocument(ctx.input.documentId);

    return {
      output: mapDocument(d),
      message: `Retrieved document **${d.name}** (status: ${d.status}).`
    };
  })
  .build();

export let sendPapersignDocument = SlateTool.create(spec, {
  name: 'Send Papersign Document',
  key: 'send_papersign_document',
  description: `Send a Papersign document for signing. Configure signers, invitation message, expiration, automatic reminders, and document variables. Optionally copy the document before sending.`,
  instructions: [
    'The expiration must be at least 30 minutes in the future.',
    'Maximum 5 document recipient email addresses.'
  ]
})
  .input(
    z.object({
      documentId: z.string().describe('The document ID to send'),
      signers: z.array(signerSchema).optional().describe('Signers for the document'),
      variables: z.array(variableSchema).optional().describe('Document variables to set'),
      expiration: z
        .string()
        .optional()
        .describe('Expiration date-time (must be >= 30 minutes in the future)'),
      inviteMessage: z
        .string()
        .optional()
        .describe('Invitation email message (max 1000 chars)'),
      fromUserEmail: z.string().optional().describe("Sender's email from team account"),
      documentRecipientEmails: z
        .array(z.string())
        .optional()
        .describe('Recipient emails to receive completed document (max 5)'),
      automaticReminders: z
        .object({
          firstAfterDays: z
            .number()
            .optional()
            .describe('Days after which the first reminder is sent'),
          followUpEveryDays: z
            .number()
            .optional()
            .describe('Interval in days for follow-up reminders')
        })
        .optional()
        .describe('Automatic reminder settings'),
      copyBeforeSending: z
        .boolean()
        .optional()
        .describe('Whether to copy the document before sending')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let sendData: Parameters<Client['sendPapersignDocument']>[1] = {};
    if (ctx.input.signers) {
      sendData.signers = ctx.input.signers.map(s => ({
        key: s.key,
        name: s.name,
        email: s.email,
        phone: s.phone,
        jobTitle: s.jobTitle,
        company: s.company
      }));
    }
    if (ctx.input.variables) sendData.variables = ctx.input.variables;
    if (ctx.input.expiration) sendData.expiration = ctx.input.expiration;
    if (ctx.input.inviteMessage) sendData.inviteMessage = ctx.input.inviteMessage;
    if (ctx.input.fromUserEmail) sendData.fromUserEmail = ctx.input.fromUserEmail;
    if (ctx.input.documentRecipientEmails)
      sendData.documentRecipientEmails = ctx.input.documentRecipientEmails;
    if (ctx.input.automaticReminders)
      sendData.automaticReminders = ctx.input.automaticReminders;
    if (ctx.input.copyBeforeSending) sendData.copy = true;

    let d = await client.sendPapersignDocument(ctx.input.documentId, sendData);

    return {
      output: mapDocument(d),
      message: `Sent document **${d.name}** for signing (${d.signers.length} signer(s)).`
    };
  })
  .build();

export let copyPapersignDocument = SlateTool.create(spec, {
  name: 'Copy Papersign Document',
  key: 'copy_papersign_document',
  description: `Copy a Papersign document, optionally to a different folder or space. You can set a new name and target location. Missing folders in the path are auto-created.`,
  constraints: ['Maximum folder path depth is 4 levels.']
})
  .input(
    z.object({
      documentId: z.string().describe('The document ID to copy'),
      name: z.string().optional().describe('Name for the copied document'),
      folderId: z.number().optional().describe('Target folder ID'),
      spaceId: z.number().optional().describe('Target space ID'),
      path: z
        .string()
        .optional()
        .describe(
          'Folder path for the copy (max 4 levels deep; missing folders are auto-created)'
        )
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let d = await client.copyPapersignDocument(ctx.input.documentId, {
      name: ctx.input.name,
      folderId: ctx.input.folderId,
      spaceId: ctx.input.spaceId,
      path: ctx.input.path
    });

    return {
      output: mapDocument(d),
      message: `Copied document to **${d.name}**.`
    };
  })
  .build();

export let movePapersignDocument = SlateTool.create(spec, {
  name: 'Move Papersign Document',
  key: 'move_papersign_document',
  description: `Move a Papersign document to a different folder or space. Optionally rename the document. Missing folders in the path are auto-created.`,
  constraints: ['Maximum folder path depth is 4 levels.']
})
  .input(
    z.object({
      documentId: z.string().describe('The document ID to move'),
      name: z.string().optional().describe('New name for the document'),
      folderId: z.number().optional().describe('Target folder ID'),
      spaceId: z.number().optional().describe('Target space ID'),
      path: z
        .string()
        .optional()
        .describe('Target path (max 4 levels; missing folders are auto-created)')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let d = await client.movePapersignDocument(ctx.input.documentId, {
      name: ctx.input.name,
      folderId: ctx.input.folderId,
      spaceId: ctx.input.spaceId,
      path: ctx.input.path
    });

    return {
      output: mapDocument(d),
      message: `Moved document **${d.name}** to ${d.folder?.name || 'new location'}.`
    };
  })
  .build();

export let cancelPapersignDocument = SlateTool.create(spec, {
  name: 'Cancel Papersign Document',
  key: 'cancel_papersign_document',
  description: `Cancel an in-progress Papersign document signing request. This stops the signing process and notifies signers.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('The document ID to cancel')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let d = await client.cancelPapersignDocument(ctx.input.documentId);

    return {
      output: mapDocument(d),
      message: `Cancelled document **${d.name}**.`
    };
  })
  .build();
