import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createVerificationRequest = SlateTool.create(spec, {
  name: 'Create Verification Request',
  key: 'create_verification_request',
  description: `Create a credential verification request to ask a holder to present their credentials. Supports both **OpenID4VC** (for SD-JWT VC and mDOC) and **DIDComm** (for AnonCreds) protocols. Returns a URI/QR code the holder can scan to present their credentials.`,
  instructions: [
    'A presentation template must be created first before creating a verification request.',
    'For didcomm: provide either a didcommConnectionId or set createInvitation to true.'
  ]
})
  .input(
    z.object({
      protocol: z.enum(['openid4vc', 'didcomm']).describe('Protocol to use for verification'),
      presentationTemplateId: z
        .string()
        .describe('ID of the presentation template defining what to verify'),
      expirationInMinutes: z
        .number()
        .optional()
        .describe('Request expiration time in minutes (default 15, openid4vc only)'),
      requireResponseEncryption: z
        .boolean()
        .optional()
        .describe('Require response encryption (openid4vc only)'),
      didcommConnectionId: z
        .string()
        .optional()
        .describe('Existing DIDComm connection ID (didcomm only)'),
      createInvitation: z
        .boolean()
        .optional()
        .describe('Create a new DIDComm invitation (didcomm only)')
    })
  )
  .output(
    z.object({
      verificationId: z.string().describe('ID of the verification session'),
      status: z.string().describe('Current status of the verification'),
      authorizationRequestUri: z
        .string()
        .optional()
        .describe('URI for the holder to authorize (openid4vc)'),
      invitationUri: z.string().optional().describe('Invitation URI (didcomm)'),
      presentationTemplateId: z.string().optional().describe('Presentation template used'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    if (ctx.input.protocol === 'openid4vc') {
      let result = await client.createOpenId4VcVerification({
        presentationTemplateId: ctx.input.presentationTemplateId,
        expirationInMinutes: ctx.input.expirationInMinutes,
        requireResponseEncryption: ctx.input.requireResponseEncryption
      });
      let data = result.data ?? result;
      return {
        output: {
          verificationId: data.id,
          status: data.status,
          authorizationRequestUri: data.authorizationRequestUri,
          presentationTemplateId: data.presentationTemplateId,
          createdAt: data.createdAt
        },
        message: `Created OpenID4VC verification request \`${data.id}\`. Status: **${data.status}**. Share the authorization URI with the holder.`
      };
    }

    let payload: any = {
      presentationTemplateId: ctx.input.presentationTemplateId
    };
    if (ctx.input.didcommConnectionId) {
      payload.didcommConnectionId = ctx.input.didcommConnectionId;
    } else {
      payload.didcommInvitation = { createConnection: ctx.input.createInvitation ?? true };
    }

    let result = await client.createDidcommVerification(payload);
    let data = result.data ?? result;

    return {
      output: {
        verificationId: data.didcommVerification?.id ?? data.id,
        status: data.didcommVerification?.status ?? data.status,
        invitationUri: data.didcommInvitation?.invitationUri,
        presentationTemplateId: ctx.input.presentationTemplateId,
        createdAt: data.createdAt
      },
      message: `Created DIDComm verification request. Status: **${data.didcommVerification?.status ?? data.status}**.`
    };
  })
  .build();
