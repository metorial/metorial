import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let issueCredential = SlateTool.create(spec, {
  name: 'Issue Credential',
  key: 'issue_credential',
  description: `Create and issue a W3C-compliant verifiable credential. Supports multiple signature algorithms including Ed25519 and BBS+ for zero-knowledge proofs. Credentials can be distributed to holders via email or wallet, and optionally persisted on Truvera's platform.`,
  instructions: [
    'The issuer must be a DID controlled by your account.',
    'For ZKP credentials, set algorithm to "dockbbs" and use a BBS+ compatible key.',
    'To enable revocation, either set revocable to true or provide a registryId in the status field.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      issuerDid: z.string().describe('DID of the credential issuer'),
      schema: z.string().optional().describe('URL of the credential schema'),
      context: z.string().optional().describe('JSON-LD context URL for the credential'),
      credentialTypes: z
        .array(z.string())
        .optional()
        .describe('Credential type identifiers (e.g. ["BasicCredential"])'),
      credentialName: z.string().optional().describe('Human-readable name for the credential'),
      credentialDescription: z.string().optional().describe('Description of the credential'),
      subject: z
        .any()
        .describe(
          'Credential subject data. Can be a single object or array of objects. Should include "id" (holder DID) and claim attributes.'
        ),
      issuanceDate: z
        .string()
        .optional()
        .describe('ISO 8601 issuance date. Defaults to current time.'),
      expirationDate: z.string().optional().describe('ISO 8601 expiration date'),
      registryId: z
        .string()
        .optional()
        .describe('Revocation registry ID to enable revocation for this credential'),
      revocable: z.boolean().optional().describe('Whether the credential should be revocable'),
      algorithm: z
        .enum(['ed25519', 'dockbbs'])
        .default('ed25519')
        .describe('Signature algorithm. Use "dockbbs" for BBS+ zero-knowledge proofs.'),
      format: z
        .enum(['jsonld', 'jwt', 'sdjwt'])
        .default('jsonld')
        .describe('Credential format'),
      persist: z
        .boolean()
        .optional()
        .describe('Whether to persist the credential on Truvera (encrypted)'),
      password: z
        .string()
        .optional()
        .describe('Password for encrypted persistence (4-32 characters)'),
      recipientEmail: z
        .string()
        .optional()
        .describe('Email address to send the credential to'),
      recipientDid: z
        .string()
        .optional()
        .describe('DID of the credential recipient for wallet delivery'),
      distribute: z
        .boolean()
        .optional()
        .describe('Whether to distribute the credential to the holder'),
      templateId: z.string().optional().describe('Design template ID for visual rendering')
    })
  )
  .output(
    z.object({
      credentialId: z.string().optional().describe('ID of the issued credential'),
      credential: z.any().describe('The full issued verifiable credential')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {
      credential: {
        name: ctx.input.credentialName,
        description: ctx.input.credentialDescription,
        schema: ctx.input.schema,
        context: ctx.input.context,
        type: ctx.input.credentialTypes,
        subject: ctx.input.subject,
        issuer: ctx.input.issuerDid,
        issuanceDate: ctx.input.issuanceDate,
        expirationDate: ctx.input.expirationDate,
        status: ctx.input.registryId
      },
      algorithm: ctx.input.algorithm,
      format: ctx.input.format,
      persist: ctx.input.persist,
      password: ctx.input.password,
      recipientEmail: ctx.input.recipientEmail,
      recipientDID: ctx.input.recipientDid,
      distribute: ctx.input.distribute,
      template: ctx.input.templateId,
      revocable: ctx.input.revocable
    };

    let result = await client.issueCredential(body);

    let credentialId = result?.id || result?.credential?.id;

    return {
      output: {
        credentialId: credentialId ? String(credentialId) : undefined,
        credential: result
      },
      message: `Issued credential${credentialId ? ` **${credentialId}**` : ''} from issuer **${ctx.input.issuerDid}**.`
    };
  })
  .build();
