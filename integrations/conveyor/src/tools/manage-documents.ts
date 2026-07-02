import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let versionSchema = z.object({
  versionId: z.string().describe('ID of the version'),
  versionNumber: z.number().describe('Version number'),
  contentType: z.string().describe('MIME type of the file'),
  filename: z.string().describe('Filename'),
  createdAt: z.string().describe('When this version was created')
});

let documentSchema = z.object({
  documentId: z.string().describe('Unique ID of the document'),
  name: z.string().describe('Document name'),
  description: z.string().nullable().optional().describe('Document description'),
  displayCertification: z.string().nullable().optional().describe('Certification badge type'),
  publiclyAccessible: z
    .boolean()
    .optional()
    .describe('Whether the document is publicly accessible'),
  featured: z
    .boolean()
    .optional()
    .describe('Whether the document is featured on the public profile'),
  folder: z.string().nullable().optional().describe('Folder name'),
  accessLevel: z
    .string()
    .optional()
    .describe('Access level: public, protected, need_to_know, or internal'),
  useForQuestionAnswering: z
    .boolean()
    .optional()
    .describe('Whether used for AI question answering'),
  disableDownloads: z.boolean().optional().describe('Whether downloads are disabled'),
  versions: z.array(versionSchema).optional().describe('Document versions'),
  createdAt: z.string().describe('When the document was created'),
  updatedAt: z.string().describe('When the document was last updated')
});

let mapDocument = (d: any) => ({
  documentId: d.id,
  name: d.name,
  description: d.description,
  displayCertification: d.display_certification,
  publiclyAccessible: d.publicly_accessible,
  featured: d.featured,
  folder: d.folder,
  accessLevel: d.access_level,
  useForQuestionAnswering: d.use_for_question_answering,
  disableDownloads: d.disable_downloads,
  versions: (d.versions || []).map((v: any) => ({
    versionId: v.id,
    versionNumber: v.version_number,
    contentType: v.content_type,
    filename: v.filename,
    createdAt: v.created_at
  })),
  createdAt: d.created_at,
  updatedAt: d.updated_at
});

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `Retrieve all documents in your Trust Center. Returns document metadata including name, access level, certification badge, folder, versions, and question answering settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      documents: z.array(documentSchema).describe('List of documents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let data = await client.listDocuments();
    let documents = (data?._embedded?.documents || []).map(mapDocument);

    return {
      output: { documents },
      message: `Found **${documents.length}** documents in the Trust Center.`
    };
  })
  .build();

export let updateDocument = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Update metadata of a Trust Center document. Modify the name, description, certification badge, access level, folder, access groups, and other settings. Only provided fields are updated.`,
  instructions: [
    'Certification options: soc2-type-2, iso-27001, hipaa, gdpr, pci.',
    'Access level options: public, protected, need_to_know, internal.',
    'For product line and access group IDs, provide comma-separated UUID strings.'
  ]
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to update'),
      name: z.string().optional().describe('New document name'),
      description: z.string().optional().describe('New document description'),
      certification: z
        .enum(['soc2-type-2', 'iso-27001', 'hipaa', 'gdpr', 'pci'])
        .optional()
        .describe('Certification badge type'),
      featured: z.boolean().optional().describe('Feature on public profile'),
      folderId: z.string().optional().describe('Move document to this folder'),
      accessLevel: z
        .enum(['public', 'protected', 'need_to_know', 'internal'])
        .optional()
        .describe('Document access level'),
      productLineIds: z.string().optional().describe('Comma-separated product line UUIDs'),
      accessGroupIds: z.string().optional().describe('Comma-separated access group UUIDs'),
      disableDownloads: z.boolean().optional().describe('Disable downloads'),
      useForQuestionAnswering: z.boolean().optional().describe('Use for AI question answering')
    })
  )
  .output(documentSchema)
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let d = await client.updateDocument(ctx.input.documentId, {
      name: ctx.input.name,
      description: ctx.input.description,
      certification: ctx.input.certification,
      featured: ctx.input.featured,
      folderId: ctx.input.folderId,
      accessLevel: ctx.input.accessLevel,
      productLineIds: ctx.input.productLineIds,
      accessGroupIds: ctx.input.accessGroupIds,
      disableDownloads: ctx.input.disableDownloads,
      useForQuestionAnswering: ctx.input.useForQuestionAnswering
    });

    return {
      output: mapDocument(d),
      message: `Document **"${d.name}"** has been updated.`
    };
  })
  .build();

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Permanently delete a document from your Trust Center. This removes the document and all associated metrics. This action cannot be undone.`,
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
      deleted: z.boolean().describe('Whether the document was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });
    await client.deleteDocument(ctx.input.documentId);

    return {
      output: { deleted: true },
      message: `Document \`${ctx.input.documentId}\` has been **permanently deleted**.`
    };
  })
  .build();
