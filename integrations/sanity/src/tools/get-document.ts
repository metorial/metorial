import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { documentId, invalid, nativeDocument, opaqueId, scopes } from '../lib/schemas';
import { spec } from '../spec';

export const getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description:
    'Read exact current document IDs or one historical revision using current access permissions. Discover project and dataset with list_projects and manage_datasets.',
  instructions: [
    'Choose documentId or documentIds. Historical reads require one documentId and exactly one revision, time, or lastRevision selector. Missing or inaccessible documents may be omitted by the native API.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...scopes,
      documentId: documentId.optional(),
      documentIds: z.array(documentId).min(1).max(100).optional(),
      revision: opaqueId
        .optional()
        .describe(
          'Historical revision _rev, discoverable with get_document. Use exactly one history selector.'
        ),
      time: z.string().datetime({ offset: true }).optional(),
      lastRevision: z.boolean().optional(),
      includeAllVersions: z.boolean().optional()
    })
  )
  .output(
    z.object({
      documents: z.array(nativeDocument),
      omitted: z
        .array(z.object({ id: documentId, reason: z.string() }).passthrough())
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const i = ctx.input;
    if ((i.documentId !== undefined) === (i.documentIds !== undefined))
      throw invalid('Provide exactly one of documentId or documentIds.');
    const selectors = [
      i.revision !== undefined,
      i.time !== undefined,
      i.lastRevision === true
    ].filter(Boolean).length;
    if (
      selectors > 1 ||
      (selectors && (i.documentIds !== undefined || i.includeAllVersions !== undefined))
    )
      throw invalid(
        'Use one historical selector with a single documentId; omit includeAllVersions.'
      );
    const result = await clientFor(ctx).getDocuments(i.documentIds ?? [i.documentId!], {
      revision: i.revision,
      time: i.time,
      lastRevision: i.lastRevision,
      includeAllVersions: i.includeAllVersions
    });
    return {
      output: { documents: result.documents, omitted: result.omitted },
      message: `Retrieved ${result.documents.length} native document(s).`
    };
  })
  .build();
