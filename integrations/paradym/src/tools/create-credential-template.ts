import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCredentialTemplate = SlateTool.create(spec, {
  name: 'Create Credential Template',
  key: 'create_credential_template',
  description: `Create a new credential template in Paradym. Supports three formats: **sd-jwt-vc** (SD-JWT VC over OpenID4VC), **mdoc** (ISO 18013-5 mDOC/mDL over OpenID4VC), and **anoncreds** (AnonCreds over DIDComm). Configure typed attributes, visual branding, validity periods, and revocability.`,
  instructions: [
    'The "format" field determines which credential format to use and which fields are relevant.',
    'For sd-jwt-vc: "type" is required as the credential type identifier.',
    'For mdoc: "type" is the doctype (e.g. "org.iso.18013.5.1.mDL").',
    'For anoncreds: provide "schema" instead of "type".'
  ]
})
  .input(
    z.object({
      format: z.enum(['sd-jwt-vc', 'mdoc', 'anoncreds']).describe('Credential format to use'),
      name: z.string().describe('Name of the credential template'),
      description: z.string().optional().describe('Description of the credential template'),
      type: z
        .string()
        .optional()
        .describe('Credential type identifier (required for sd-jwt-vc and mdoc)'),
      schema: z
        .record(z.string(), z.any())
        .optional()
        .describe('Schema definition (required for anoncreds)'),
      attributes: z
        .record(z.string(), z.any())
        .describe('Attribute definitions for the credential'),
      issuer: z
        .record(z.string(), z.any())
        .describe(
          'Issuer configuration (e.g. { method: "did:web" } or { method: "did:cheqd", network: "testnet" })'
        ),
      revocable: z
        .boolean()
        .optional()
        .describe('Whether issued credentials can be revoked (sd-jwt-vc and anoncreds only)'),
      background: z
        .record(z.string(), z.any())
        .optional()
        .describe('Background branding (e.g. { color: "#1E3A5F", imageUrl: "..." })'),
      text: z
        .record(z.string(), z.any())
        .optional()
        .describe('Text branding (e.g. { color: "#FFFFFF" })'),
      validFrom: z
        .string()
        .optional()
        .describe('ISO 8601 date for credential validity start (sd-jwt-vc only)'),
      validUntil: z.string().optional().describe('ISO 8601 date for credential validity end')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the created credential template'),
      name: z.string().describe('Name of the credential template'),
      format: z.string().describe('Credential format'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result: any;

    if (ctx.input.format === 'sd-jwt-vc') {
      result = await client.createSdJwtCredentialTemplate({
        name: ctx.input.name,
        type: ctx.input.type!,
        attributes: ctx.input.attributes,
        issuer: ctx.input.issuer,
        description: ctx.input.description,
        revocable: ctx.input.revocable,
        background: ctx.input.background,
        text: ctx.input.text,
        validFrom: ctx.input.validFrom,
        validUntil: ctx.input.validUntil
      });
    } else if (ctx.input.format === 'mdoc') {
      result = await client.createMdocCredentialTemplate({
        name: ctx.input.name,
        type: ctx.input.type!,
        attributes: ctx.input.attributes,
        issuer: ctx.input.issuer,
        description: ctx.input.description,
        background: ctx.input.background,
        text: ctx.input.text,
        validUntil: ctx.input.validUntil
      });
    } else {
      result = await client.createAnonCredsCredentialTemplate({
        name: ctx.input.name,
        schema: ctx.input.schema!,
        attributes: ctx.input.attributes,
        issuer: ctx.input.issuer,
        description: ctx.input.description,
        revocable: ctx.input.revocable,
        background: ctx.input.background,
        text: ctx.input.text
      });
    }

    let data = result.data ?? result;

    return {
      output: {
        templateId: data.id,
        name: data.name,
        format: data.format ?? ctx.input.format,
        createdAt: data.createdAt
      },
      message: `Created **${ctx.input.format}** credential template "${ctx.input.name}" with ID \`${data.id}\`.`
    };
  })
  .build();
