import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let participantSchema = z.object({
  email: z.string().describe('Email address of the participant'),
  securityOption: z
    .object({
      authenticationMethod: z
        .enum(['NONE', 'PASSWORD', 'PHONE', 'KBA', 'EMAIL_OTP'])
        .optional()
        .describe('Authentication method for this participant')
    })
    .optional()
    .describe('Security/authentication options for the participant')
});

let participantSetSchema = z.object({
  memberInfos: z.array(participantSchema).describe('List of participants in this set'),
  role: z
    .enum([
      'SIGNER',
      'APPROVER',
      'ACCEPTOR',
      'FORM_FILLER',
      'CERTIFIED_RECIPIENT',
      'DELEGATE_TO_SIGNER',
      'DELEGATE_TO_APPROVER'
    ])
    .describe('Role of the participants in this set'),
  order: z
    .number()
    .optional()
    .describe('Signing order for sequential workflows (1-based). Omit for parallel signing.')
});

let fileInfoSchema = z.object({
  transientDocumentId: z
    .string()
    .optional()
    .describe('ID of a previously uploaded transient document'),
  libraryDocumentId: z.string().optional().describe('ID of a library document template'),
  urlFileInfo: z
    .object({
      url: z.string().describe('Public URL of the document'),
      name: z.string().optional().describe('Display name for the document'),
      mimeType: z.string().optional().describe('MIME type of the document')
    })
    .optional()
    .describe('URL-based document reference')
});

export let createAgreement = SlateTool.create(spec, {
  name: 'Create Agreement',
  key: 'create_agreement',
  description: `Create and send a new agreement (document for signature). Supports sequential and parallel signing workflows with multiple participant roles. Documents can be referenced by transient document ID, library template ID, or URL.`,
  instructions: [
    'Upload documents first using the Upload Document tool to get a transientDocumentId, or use an existing libraryDocumentId.',
    'For sequential signing, set the "order" field on each participant set. For parallel signing, omit the order field.',
    'Set state to "DRAFT" to create without sending, or "IN_PROCESS" to send immediately.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name/title of the agreement'),
      participantSetsInfo: z
        .array(participantSetSchema)
        .describe('List of participant sets (signers, approvers, etc.)'),
      fileInfos: z.array(fileInfoSchema).describe('Documents to include in the agreement'),
      signatureType: z
        .enum(['ESIGN', 'WRITTEN'])
        .optional()
        .describe('Type of signature. Defaults to "ESIGN".'),
      state: z
        .enum(['IN_PROCESS', 'DRAFT', 'AUTHORING'])
        .optional()
        .describe(
          'Initial state. "IN_PROCESS" sends immediately, "DRAFT" saves without sending. Defaults to "IN_PROCESS".'
        ),
      message: z.string().optional().describe('Message to include in the signing email'),
      ccs: z
        .array(
          z.object({
            email: z.string().describe('Email address to CC')
          })
        )
        .optional()
        .describe('Email addresses to CC on agreement notifications'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier for tracking the agreement in your system'),
      reminderFrequency: z
        .enum([
          'DAILY_UNTIL_SIGNED',
          'WEEKDAILY_UNTIL_SIGNED',
          'EVERY_OTHER_DAY_UNTIL_SIGNED',
          'EVERY_THIRD_DAY_UNTIL_SIGNED',
          'EVERY_FIFTH_DAY_UNTIL_SIGNED',
          'WEEKLY_UNTIL_SIGNED'
        ])
        .optional()
        .describe('Automatic reminder frequency'),
      expirationTime: z
        .string()
        .optional()
        .describe('Agreement expiration date-time in ISO 8601 format')
    })
  )
  .output(
    z.object({
      agreementId: z.string().describe('ID of the created agreement')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.createAgreement({
      name: ctx.input.name,
      participantSetsInfo: ctx.input.participantSetsInfo,
      fileInfos: ctx.input.fileInfos,
      signatureType: ctx.input.signatureType,
      state: ctx.input.state,
      message: ctx.input.message,
      ccs: ctx.input.ccs,
      externalId: ctx.input.externalId ? { id: ctx.input.externalId } : undefined,
      reminderFrequency: ctx.input.reminderFrequency,
      expirationTime: ctx.input.expirationTime
    });

    let state = ctx.input.state || 'IN_PROCESS';
    return {
      output: { agreementId: result.id },
      message: `Created agreement **${ctx.input.name}** (\`${result.id}\`) in state **${state}**.`
    };
  });
