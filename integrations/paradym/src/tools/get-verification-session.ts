import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVerificationSession = SlateTool.create(spec, {
  name: 'Get Verification Session',
  key: 'get_verification_session',
  description: `Retrieve details and results of a credential verification session. Use this to check if a holder has presented their credentials and to access the verified credential data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      protocol: z
        .enum(['openid4vc', 'didcomm'])
        .describe('Protocol used for the verification'),
      verificationId: z.string().describe('ID of the verification session to retrieve')
    })
  )
  .output(
    z.object({
      verificationId: z.string().describe('ID of the verification session'),
      status: z.string().describe('Current status of the verification'),
      presentationTemplateId: z.string().optional().describe('Presentation template used'),
      credentials: z
        .any()
        .optional()
        .describe('Verified credential data (available when status is verified)'),
      error: z.any().optional().describe('Error details if verification failed'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().optional().describe('ISO 8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result: any;
    if (ctx.input.protocol === 'openid4vc') {
      result = await client.getOpenId4VcVerification(ctx.input.verificationId);
    } else {
      result = await client.getDidcommVerification(ctx.input.verificationId);
    }

    let data = result.data ?? result;

    return {
      output: {
        verificationId: data.id,
        status: data.status,
        presentationTemplateId: data.presentationTemplateId,
        credentials: data.credentials,
        error: data.error,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      },
      message: `Verification session \`${data.id}\` status: **${data.status}**.${data.credentials ? ` Received ${Array.isArray(data.credentials) ? data.credentials.length : 1} credential(s).` : ''}`
    };
  })
  .build();
