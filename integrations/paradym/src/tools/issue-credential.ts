import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let issueCredential = SlateTool.create(spec, {
  name: 'Issue Credential',
  key: 'issue_credential',
  description: `Issue a verifiable credential to a holder. Supports three methods:
- **openid4vc**: Creates an OpenID4VC issuance offer with a scannable URI/QR code for SD-JWT VC credentials.
- **didcomm**: Creates a DIDComm issuance offer for AnonCreds credentials via invitation or existing connection.
- **direct**: Directly signs and returns an SD-JWT VC credential without an exchange protocol.`,
  instructions: [
    'For openid4vc: provide credentialTemplateId and attributes in the credentials array.',
    'For didcomm: provide a single credential with credentialTemplateId and attributes, plus either a didcommConnectionId or set createInvitation to true.',
    'For direct: provide a single credentialTemplateId and attributes; the signed credential is returned immediately.'
  ]
})
  .input(
    z.object({
      method: z.enum(['openid4vc', 'didcomm', 'direct']).describe('Issuance method to use'),
      credentials: z
        .array(
          z.object({
            credentialTemplateId: z
              .string()
              .describe('ID of the credential template to issue'),
            attributes: z
              .record(z.string(), z.any())
              .optional()
              .describe('Attribute values to populate the credential with')
          })
        )
        .describe(
          'Credentials to issue (multiple supported for openid4vc; single for didcomm and direct)'
        ),
      expirationInMinutes: z
        .number()
        .optional()
        .describe('Offer expiration time in minutes (default 15, openid4vc only)'),
      didcommConnectionId: z
        .string()
        .optional()
        .describe('Existing DIDComm connection ID to send offer to (didcomm only)'),
      createInvitation: z
        .boolean()
        .optional()
        .describe(
          'Create a new DIDComm invitation for the offer (didcomm only, default true if no connectionId)'
        )
    })
  )
  .output(
    z.object({
      issuanceId: z.string().optional().describe('ID of the issuance session'),
      status: z.string().optional().describe('Current status of the issuance'),
      offerUri: z.string().optional().describe('URI for the credential offer (openid4vc)'),
      invitationUri: z.string().optional().describe('Invitation URI for DIDComm offer'),
      sdJwtVc: z
        .any()
        .optional()
        .describe('The signed SD-JWT VC credential (direct issuance only)'),
      credentials: z.any().optional().describe('Credential details from the issuance response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    if (ctx.input.method === 'openid4vc') {
      let result = await client.createOpenId4VcIssuanceOffer({
        credentials: ctx.input.credentials,
        expirationInMinutes: ctx.input.expirationInMinutes
      });
      let data = result.data ?? result;
      return {
        output: {
          issuanceId: data.id,
          status: data.status,
          offerUri: data.offerUri,
          credentials: data.credentials
        },
        message: `Created OpenID4VC issuance offer with ID \`${data.id}\`. Status: **${data.status}**. Share the offer URI with the credential holder.`
      };
    }

    if (ctx.input.method === 'didcomm') {
      let cred = ctx.input.credentials[0]!;
      let payload: any = {
        credential: {
          credentialTemplateId: cred.credentialTemplateId,
          attributes: cred.attributes
        }
      };
      if (ctx.input.didcommConnectionId) {
        payload.didcommConnectionId = ctx.input.didcommConnectionId;
      } else {
        payload.didcommInvitation = { createConnection: ctx.input.createInvitation ?? true };
      }

      let result = await client.createDidcommIssuanceOffer(payload);
      let data = result.data ?? result;
      return {
        output: {
          issuanceId: data.didcommIssuance?.id,
          status: data.didcommIssuance?.status,
          invitationUri: data.didcommInvitation?.invitationUri,
          credentials: data.didcommIssuance?.credential
        },
        message: `Created DIDComm issuance offer. Status: **${data.didcommIssuance?.status}**.${data.didcommInvitation?.invitationUri ? ' Share the invitation URI with the holder.' : ''}`
      };
    }

    // direct
    let cred = ctx.input.credentials[0]!;
    let result = await client.directIssueSdJwtVc({
      credentialTemplateId: cred.credentialTemplateId,
      attributes: cred.attributes
    });
    let data = result.data ?? result;
    return {
      output: {
        sdJwtVc: data.sdJwtVc,
        credentials: data.credential
      },
      message: `Directly issued SD-JWT VC credential using template \`${cred.credentialTemplateId}\`.`
    };
  })
  .build();
