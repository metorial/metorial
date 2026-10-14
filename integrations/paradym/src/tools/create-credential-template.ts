import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema, validitySchema } from '../lib/schemas';
import { spec } from '../spec';

export let createCredentialTemplate = SlateTool.create(spec, {
  name: 'Create Credential Template',
  key: 'create_credential_template',
  description: `Create a new credential template in Paradym. Supports three formats: **sd-jwt-vc** (SD-JWT VC over OpenID4VC), **mdoc** (ISO 18013-5 mDOC/mDL over OpenID4VC), and **anoncreds** (AnonCreds over DIDComm). Configure typed attributes, visual branding, validity periods, and revocability.`,
  instructions: [
    'Call list_projects to choose the projectId for this operation.',
    'The "format" field determines which credential format to use and which fields are relevant.',
    'For sd-jwt-vc: "type" is required as the credential type identifier.',
    'For mdoc: "type" is the doctype (e.g. "org.iso.18013.5.1.mDL").',
    'For anoncreds: schemaId is optional; omit it to create a new schema. Branding is not supported.'
  ]
})
  .input(
    z.object({
      projectId: projectIdSchema,
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
        .describe(
          'Legacy schema object. Use schemaId for an existing AnonCreds schema identifier.'
        ),
      schemaId: z
        .string()
        .optional()
        .describe('Existing AnonCreds schema URI. Omit to generate a schema.'),
      validity: validitySchema
        .optional()
        .describe(
          'Relative validity period. Required for mdoc, e.g. { future: { months: 6 } }. For sd-jwt-vc include start: issuance or validFrom.'
        ),
      attributes: z
        .record(z.string(), z.any())
        .describe('Attribute definitions for the credential'),
      issuer: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Issuer configuration: { signer: "did:web" }, { signer: "did:cheqd:testnet" }, or { signer: "certificate", keyType: "P-256" }. Legacy method/network objects are accepted. Required for mdoc; optional otherwise.'
        ),
      revocable: z.boolean().optional().describe('Whether issued credentials can be revoked'),
      background: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Background branding (e.g. { color: "#1E3A5F", url: "https://example.com/image.png" })'
        ),
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
      projectId: ctx.input.projectId ?? ctx.config.projectId
    });

    if (ctx.input.format !== 'anoncreds' && !ctx.input.type?.trim()) {
      throw createApiServiceError(
        'type is required for sd-jwt-vc and mdoc credential templates.'
      );
    }
    if (ctx.input.schema && !ctx.input.schemaId) {
      throw createApiServiceError(
        'schema must be an existing AnonCreds schema URI. Supply it through schemaId, or omit schema to create a new schema.'
      );
    }
    if (ctx.input.format === 'mdoc' && !ctx.input.validity) {
      throw createApiServiceError(
        'mdoc requires a relative validity period. Provide validity, for example { future: { months: 6 } }.'
      );
    }
    if (ctx.input.validity && Object.keys(ctx.input.validity.future).length === 0) {
      throw createApiServiceError('validity.future must include days, months, or years.');
    }
    if (ctx.input.format === 'mdoc' && ctx.input.validity?.start === 'validFrom') {
      throw createApiServiceError(
        'mdoc validity starts at issuance, so validity.start cannot be validFrom.'
      );
    }
    if (ctx.input.validity && ctx.input.validUntil) {
      throw createApiServiceError('Provide only one of validity or validUntil.');
    }
    let issuer = ctx.input.issuer;
    if (issuer?.method && !issuer.signer) {
      let method = issuer.method;
      if (method === 'did:cheqd' && !issuer.network) {
        throw createApiServiceError(
          'Supply network for a did:cheqd issuer, or use signer: did:cheqd:testnet or did:cheqd:mainnet.'
        );
      }
      issuer = {
        signer: method === 'did:cheqd' ? `${method}:${issuer.network}` : method,
        ...(issuer.keyType !== undefined ? { keyType: issuer.keyType } : {})
      };
    }
    if (ctx.input.format === 'mdoc' && issuer?.signer !== 'certificate') {
      throw createApiServiceError(
        'mdoc requires a certificate issuer, for example { signer: "certificate", keyType: "P-256" }.'
      );
    }
    if (
      ctx.input.format === 'anoncreds' &&
      (ctx.input.background ||
        ctx.input.text ||
        ctx.input.validFrom ||
        ctx.input.validUntil ||
        ctx.input.validity)
    ) {
      throw createApiServiceError(
        'AnonCreds templates do not support branding or validity periods. Omit background, text, validFrom, validUntil, and validity.'
      );
    }
    let validUntil = ctx.input.validity
      ? {
          ...ctx.input.validity,
          start: ctx.input.validity.start ?? 'issuance'
        }
      : ctx.input.validUntil;
    let result: any;

    if (ctx.input.format === 'sd-jwt-vc') {
      result = await client.createSdJwtCredentialTemplate({
        name: ctx.input.name,
        type: ctx.input.type!,
        attributes: ctx.input.attributes,
        issuer,
        description: ctx.input.description,
        revocable: ctx.input.revocable,
        background: ctx.input.background,
        text: ctx.input.text,
        validFrom: ctx.input.validFrom,
        validUntil
      });
    } else if (ctx.input.format === 'mdoc') {
      result = await client.createMdocCredentialTemplate({
        name: ctx.input.name,
        type: ctx.input.type!,
        attributes: ctx.input.attributes,
        issuer,
        description: ctx.input.description,
        revocable: ctx.input.revocable,
        background: ctx.input.background,
        text: ctx.input.text,
        validUntil
      });
    } else {
      result = await client.createAnonCredsCredentialTemplate({
        name: ctx.input.name,
        schema: ctx.input.schemaId,
        attributes: ctx.input.attributes,
        issuer,
        description: ctx.input.description,
        revocable: ctx.input.revocable
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
