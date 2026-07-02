import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createWebForm = SlateTool.create(spec, {
  name: 'Create Web Form',
  key: 'create_web_form',
  description: `Create an embeddable web form (widget) that generates a unique signing URL. Each time a participant fills in the web form, a new agreement is generated. Web forms can be embedded on websites or shared via link.`,
  instructions: [
    'Upload the document first using the Upload Document tool, then reference the transientDocumentId.',
    'Current Adobe Acrobat Sign v6 web form creation supports transientDocumentId or urlFileInfo documents, not libraryDocumentId.',
    'The primary web form participant has an unknown email at creation time; set participantRole and optional participantSecurityOption instead of an email address.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the web form'),
      fileInfos: z
        .array(
          z.object({
            transientDocumentId: z
              .string()
              .optional()
              .describe('ID of a previously uploaded transient document'),
            urlFileInfo: z
              .object({
                url: z.string().describe('Public URL of the document'),
                name: z.string().optional().describe('Display name for the document'),
                mimeType: z.string().optional().describe('MIME type of the document')
              })
              .optional()
              .describe('URL-based document reference')
          })
        )
        .describe('Documents to use in the web form'),
      participantRole: z
        .enum(['SIGNER', 'APPROVER', 'ACCEPTOR', 'FORM_FILLER', 'CERTIFIED_RECIPIENT'])
        .optional()
        .describe('Role of the unknown primary web form participant. Defaults to SIGNER.'),
      participantSecurityOption: z
        .object({
          authenticationMethod: z
            .enum(['NONE', 'PASSWORD', 'PHONE', 'KBA', 'EMAIL_OTP'])
            .optional()
            .describe('Authentication method for the unknown primary participant')
        })
        .optional()
        .describe('Optional security settings for the unknown primary web form participant'),
      additionalParticipantSetsInfo: z
        .array(
          z.object({
            memberInfos: z
              .array(
                z.object({
                  email: z.string().describe('Email address of the participant')
                })
              )
              .describe('Participant members'),
            role: z
              .enum(['SIGNER', 'APPROVER', 'ACCEPTOR', 'FORM_FILLER', 'CERTIFIED_RECIPIENT'])
              .describe('Role of the participants')
          })
        )
        .optional()
        .describe('Additional participants that act after the web form signer'),
      ccs: z
        .array(
          z.object({
            email: z.string().describe('Email address to CC')
          })
        )
        .optional()
        .describe('Email addresses to CC when web form agreements complete'),
      state: z
        .enum(['ACTIVE', 'DRAFT', 'AUTHORING'])
        .optional()
        .describe('Initial state of the web form. Defaults to "ACTIVE".')
    })
  )
  .output(
    z.object({
      webFormId: z.string().describe('ID of the created web form'),
      url: z.string().optional().describe('Public URL for the web form'),
      javascript: z.string().optional().describe('JavaScript embed code for the web form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.createWebForm({
      name: ctx.input.name,
      fileInfos: ctx.input.fileInfos,
      widgetParticipantSetInfo: {
        role: ctx.input.participantRole || 'SIGNER',
        memberInfos: [
          ctx.input.participantSecurityOption
            ? { securityOption: ctx.input.participantSecurityOption }
            : {}
        ]
      },
      additionalParticipantSetsInfo: ctx.input.additionalParticipantSetsInfo,
      ccs: ctx.input.ccs,
      state: ctx.input.state
    });

    return {
      output: {
        webFormId: result.id,
        url: result.url,
        javascript: result.javascript
      },
      message: `Created web form **${ctx.input.name}** (\`${result.id}\`).${result.url ? ` URL: ${result.url}` : ''}`
    };
  });
