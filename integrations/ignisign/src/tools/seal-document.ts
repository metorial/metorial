import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let sealDocument = SlateTool.create(spec, {
  name: 'Seal Document (E-Seal)',
  key: 'seal_document',
  description: `Apply a corporate electronic seal (E-Seal) to documents using a machine-to-machine (M2M) emitter. E-Seals prove the origin and integrity of corporate documents without requiring individual signers.`,
  instructions: [
    'You need a valid M2M emitter ID configured in the Ignisign Console.',
    'Provide the document IDs and any required seal parameters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      m2mId: z.string().describe('M2M seal emitter ID'),
      documentIds: z
        .array(z.string())
        .optional()
        .describe(
          'A single existing document ID to seal by its stored hash; use document for content sealing'
        ),
      document: z
        .object({
          documentType: z.enum([
            'PDF',
            'PDF_ENCRYPTED',
            'FILE',
            'DATA_JSON',
            'DATA_XML',
            'PRIVATE_FILE'
          ]),
          documentHash: z
            .string()
            .min(1)
            .describe('SHA-256 hash matching the provided document content'),
          label: z.string().optional(),
          mimeType: z.string().optional(),
          contentB64: z.string().optional(),
          jsonContent: z.record(z.string(), z.any()).optional(),
          xmlContent: z.string().optional()
        })
        .optional()
        .describe('Document content or private document hash to seal'),
      documentHashSignedByM2MPrivateKey: z
        .string()
        .optional()
        .describe('Document hash signed using the emitter private key, as hexadecimal'),
      title: z.string().optional().describe('Title for the seal request'),
      externalId: z.string().optional().describe('External ID for correlation')
    })
  )
  .output(
    z.object({
      m2mId: z.string().describe('M2M emitter ID used'),
      result: z.any().describe('Seal operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.auth.appId ?? ctx.config.appId,
      appEnv: ctx.auth.appEnv ?? ctx.config.appEnv
    });

    if (!ctx.input.documentHashSignedByM2MPrivateKey) {
      throw createApiServiceError(
        'Provide documentHashSignedByM2MPrivateKey signed with the M2M emitter private key.'
      );
    }
    if (ctx.input.document && ctx.input.documentIds?.length) {
      throw createApiServiceError('Provide document or documentIds, not both.');
    }
    let document = ctx.input.document;
    if (!document) {
      let documentId = ctx.input.documentIds?.[0];
      if (ctx.input.documentIds?.length !== 1 || !documentId)
        throw createApiServiceError(
          'Provide document, or exactly one existing document ID to seal by its hash.'
        );
      let existing = await client.getDocument(documentId);
      if (!existing.documentHash)
        throw createApiServiceError(
          'The selected document has no stored hash. Provide its content before sealing.'
        );
      document = {
        documentType: 'PRIVATE_FILE',
        documentHash: existing.documentHash,
        label: existing.label,
        mimeType: existing.mimeType
      };
    }
    let result = await client.signM2M(
      ctx.input.m2mId,
      pickDefined({
        m2mId: ctx.input.m2mId,
        title: ctx.input.title,
        externalId: ctx.input.externalId,
        document,
        documentHashSignedByM2MPrivateKey: ctx.input.documentHashSignedByM2MPrivateKey
      })
    );
    if (result.proofBase64) {
      await ctx.addAttachment({
        type: 'content',
        content: Buffer.from(result.proofBase64, 'base64'),
        filename: `seal-${result.documentId}`
      });
    }

    return {
      output: {
        m2mId: ctx.input.m2mId,
        result
      },
      message: `E-Seal applied successfully using M2M emitter **${ctx.input.m2mId}**.`
    };
  })
  .build();
