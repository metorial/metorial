import { SlateTool } from 'slates';
import { z } from 'zod';
import { ContentApiClient } from '../lib/client';
import { invalid, protect } from '../lib/contracts';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve a single document by its ID or by its UID and type. Returns the full document with all field data.`,
  instructions: [
    'Provide either "documentId" to fetch by ID, or both "uid" and "documentType" to fetch by UID.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().optional().describe('Document ID to retrieve'),
      uid: z.string().optional().describe('Document UID to retrieve (requires documentType)'),
      documentType: z
        .string()
        .optional()
        .describe('Document type for UID-based lookup (required when using uid)'),
      lang: z.string().optional().describe('Language code (use "*" for all languages)'),
      fetchLinks: z
        .string()
        .optional()
        .describe('Comma-separated list of fields to fetch from linked documents'),
      graphQuery: z
        .string()
        .optional()
        .describe('GraphQuery string for precise field selection'),
      ref: z
        .string()
        .optional()
        .describe('Content ref to query (defaults to master/published ref)')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique document ID'),
      uid: z.string().nullable().describe('User-friendly unique identifier'),
      type: z.string().describe('Document type'),
      tags: z.array(z.string()).describe('Tags applied to the document'),
      lang: z.string().describe('Language code'),
      firstPublicationDate: z.string().describe('ISO date of first publication'),
      lastPublicationDate: z.string().describe('ISO date of last publication'),
      url: z.string().nullable().describe('Resolved URL'),
      href: z.string().describe('API URL'),
      slugs: z.array(z.string()).describe('URL slugs'),
      alternateLanguages: z
        .array(
          z.object({
            documentId: z.string(),
            uid: z.string().nullable(),
            type: z.string(),
            lang: z.string()
          })
        )
        .describe('Alternate language versions'),
      data: z.record(z.string(), z.unknown()).describe('Document field data')
    })
  )
  .handleInvocation(async ctx => {
    const protectedTokens = [
      ctx.auth.token,
      ctx.auth.writeToken,
      ctx.auth.migrationToken
    ].filter((value): value is string => !!value);
    protect(ctx.input, protectedTokens);
    let client = new ContentApiClient({
      repositoryName: ctx.config.repositoryName,
      protectedTokens,
      accessToken: ctx.auth.token
    });

    let doc: Awaited<ReturnType<ContentApiClient['getDocumentById']>>;
    if (
      ctx.input.documentId !== undefined &&
      (ctx.input.uid !== undefined || ctx.input.documentType !== undefined)
    )
      invalid('Provide documentId or UID with documentType, not both lookup modes.');
    if (ctx.input.documentId) {
      doc = await client.getDocumentById(ctx.input.documentId, {
        ref: ctx.input.ref,
        lang: ctx.input.lang,
        fetchLinks: ctx.input.fetchLinks,
        graphQuery: ctx.input.graphQuery
      });
    } else if (ctx.input.uid && ctx.input.documentType) {
      doc = await client.getDocumentByUid(ctx.input.documentType, ctx.input.uid, {
        ref: ctx.input.ref,
        lang: ctx.input.lang,
        fetchLinks: ctx.input.fetchLinks,
        graphQuery: ctx.input.graphQuery
      });
    } else {
      invalid('Provide either "documentId" or both "uid" and "documentType".');
    }

    if (!doc) {
      invalid('Document not found.');
    }

    let output = {
      documentId: doc.id,
      uid: doc.uid,
      type: doc.type,
      tags: doc.tags,
      lang: doc.lang,
      firstPublicationDate: doc.first_publication_date,
      lastPublicationDate: doc.last_publication_date,
      url: doc.url,
      href: doc.href,
      slugs: doc.slugs,
      alternateLanguages: doc.alternate_languages.map(al => ({
        documentId: al.id,
        uid: al.uid,
        type: al.type,
        lang: al.lang
      })),
      data: doc.data
    };

    return {
      output,
      message: `Retrieved document **${doc.uid || doc.id}** (type: ${doc.type}, lang: ${doc.lang}).`
    };
  })
  .build();
