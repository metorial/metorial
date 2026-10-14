import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let issueCredential = SlateTool.create(spec, {
  name: 'Issue Credential',
  key: 'issue_credential',
  description: `Issue a W3C Verifiable Credential. Supports anchoring on blockchain, persisting for later retrieval, and distributing to recipients via email or Truvera Wallet.
Optionally reference a schema for structure enforcement and a design template for visual presentation.`,
  instructions: [
    'The issuer must be a DID controlled by the connected Truvera account.',
    'Set anchor to true to publish a hash on the blockchain as proof of issuance with a timestamp.',
    'Set persist to true to store the credential encrypted on Truvera servers for later retrieval.',
    'Set distribute to true and provide recipientEmail, subjectDid, or subjectClaims.id to send the credential to the recipient.',
    'Set persist to true only with a password. Set revocable to true to provision a revocation registry automatically.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      issuerDid: z.string().describe('DID of the credential issuer'),
      subjectDid: z.string().optional().describe('DID of the credential subject'),
      credentialType: z
        .array(z.string())
        .optional()
        .describe('Credential type(s), e.g. ["UniversityDegreeCredential"]'),
      subjectClaims: z
        .record(z.string(), z.unknown())
        .describe('Claims/attributes about the subject to include in the credential'),
      issuanceDate: z
        .string()
        .optional()
        .describe('ISO 8601 issuance date. Defaults to current time'),
      expirationDate: z
        .string()
        .optional()
        .describe('ISO 8601 expiration date for the credential'),
      credentialName: z.string().optional().describe('Human-readable name for the credential'),
      credentialDescription: z.string().optional().describe('Description of the credential'),
      anchor: z.boolean().optional().describe('Anchor the credential hash on the blockchain'),
      persist: z
        .boolean()
        .optional()
        .describe('Store the credential encrypted on Truvera servers'),
      password: z
        .string()
        .optional()
        .describe('Password for encrypting the persisted credential'),
      distribute: z.boolean().optional().describe('Send the credential to the recipient'),
      recipientEmail: z
        .string()
        .optional()
        .describe('Email address to send the credential to'),
      schemaUri: z
        .string()
        .optional()
        .describe('URI of a credential schema to enforce structure'),
      templateId: z
        .string()
        .optional()
        .describe('ID of a certificate design template to apply'),
      algorithm: z
        .string()
        .optional()
        .describe('Signing algorithm. Use dockbbs for zero-knowledge proof credentials'),
      revocable: z
        .boolean()
        .optional()
        .describe('Automatically provision a registry so the credential can be revoked'),
      registryId: z
        .string()
        .optional()
        .describe(
          'Existing revocation registry ID to associate with the credential. Omit when supplying status'
        ),
      context: z.array(z.string()).optional().describe('Additional JSON-LD context URIs'),
      status: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Credential status for revocation. Include registry and type information')
    })
  )
  .output(
    z.object({
      credentialId: z
        .string()
        .optional()
        .describe('Unique identifier for the issued credential'),
      credential: z
        .record(z.string(), z.unknown())
        .describe('The full issued Verifiable Credential document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let subject: Record<string, unknown> = { ...ctx.input.subjectClaims };
    if (ctx.input.subjectDid) {
      subject.id = ctx.input.subjectDid;
    }

    if (ctx.input.persist && !ctx.input.password) {
      throw createApiServiceError('password is required when persist is true.');
    }
    let hasRecipientDid = typeof subject.id === 'string' && subject.id.trim().length > 0;
    if (ctx.input.distribute && !ctx.input.recipientEmail && !hasRecipientDid) {
      throw createApiServiceError(
        'Provide recipientEmail, subjectDid, or a nonempty subjectClaims.id when distribute is true.'
      );
    }
    if (ctx.input.registryId && ctx.input.status) {
      throw createApiServiceError('Provide either registryId or status, not both.');
    }

    let result = await client.issueCredential({
      anchor: ctx.input.anchor,
      persist: ctx.input.persist,
      distribute: ctx.input.distribute,
      recipientEmail: ctx.input.recipientEmail,
      algorithm: ctx.input.algorithm,
      revocable: ctx.input.revocable,
      template: ctx.input.templateId,
      password: ctx.input.password,
      credential: {
        type: ctx.input.credentialType,
        schema: ctx.input.schemaUri,
        subject,
        issuer: ctx.input.issuerDid,
        issuanceDate: ctx.input.issuanceDate,
        expirationDate: ctx.input.expirationDate,
        context: ctx.input.context,
        status: ctx.input.registryId ?? ctx.input.status,
        name: ctx.input.credentialName,
        description: ctx.input.credentialDescription
      }
    });

    let credentialId =
      typeof result.id === 'string'
        ? result.id
        : typeof result.credentialId === 'string'
          ? result.credentialId
          : undefined;

    return {
      output: {
        credentialId,
        credential: result
      },
      message: `Issued credential${credentialId ? ` **${credentialId}**` : ''} from issuer **${ctx.input.issuerDid}**${ctx.input.recipientEmail ? ` to **${ctx.input.recipientEmail}**` : ''}`
    };
  })
  .build();
