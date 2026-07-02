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
    'A library template ID can also be used instead of a transient document.'
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
            libraryDocumentId: z
              .string()
              .optional()
              .describe('ID of a library document template')
          })
        )
        .describe('Documents to use in the web form'),
      participantSetsInfo: z
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
        .describe('Pre-defined participant sets for the web form'),
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
      participantSetsInfo: ctx.input.participantSetsInfo,
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
