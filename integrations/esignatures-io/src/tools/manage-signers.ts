import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let signerDetailsSchema = z.object({
  name: z.string().optional().describe('Full name of the signer'),
  email: z.string().optional().describe('Email address of the signer'),
  mobile: z.string().optional().describe('Mobile phone number with country code'),
  companyName: z.string().optional().describe('Company name of the signer'),
  signingOrder: z.string().optional().describe('Order in which this signer should sign'),
  signatureRequestDeliveryMethods: z
    .array(z.enum(['email', 'sms']))
    .optional()
    .describe('Delivery methods for signature request'),
  signedDocumentDeliveryMethod: z
    .enum(['email', 'no_delivery', 'sms', ''])
    .optional()
    .describe(
      'Final document delivery: email, sms, or an empty string; no_delivery is also accepted'
    ),
  multiFactorAuthentications: z
    .array(z.enum(['sms_verification_code', 'email_verification_code', 'photo_id']))
    .optional()
    .describe('MFA methods for identity verification'),
  redirectUrl: z.string().optional().describe('URL to redirect the signer to after signing')
});

export let manageSigners = SlateTool.create(spec, {
  name: 'Manage Signers',
  key: 'manage_signers',
  description: `Add, update, remove, or send/resend a contract to a signer. Use the \`action\` field to choose the operation. Adding a signer does not automatically send the contract — use "send" to deliver it.`,
  instructions: [
    'For "add", provide signer details in the `signer` field. Name is required.',
    'For "update", provide the signerId and only the fields you want to change in `signer`.',
    'For "delete", provide the signerId only.',
    'For "send", provide the signerId to send or resend the contract to that signer.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contractId: z.string().describe('ID of the contract'),
      action: z
        .enum(['add', 'update', 'delete', 'send'])
        .describe('Action to perform on the signer'),
      signerId: z
        .string()
        .optional()
        .describe('ID of the signer (required for update, delete, and send)'),
      signer: signerDetailsSchema
        .optional()
        .describe('Signer details (for add and update actions)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the operation'),
      signerId: z
        .string()
        .optional()
        .describe(
          'ID of the signer when provided; use query_contract to discover newly added signers'
        ),
      signPageUrl: z.string().optional().describe('Sign page URL for the signer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { contractId, action, signerId, signer } = ctx.input;

    let result: Awaited<ReturnType<Client['addSigner']>>;
    let message: string;

    switch (action) {
      case 'add': {
        if (!signer?.name) {
          throw createApiServiceError('Signer name is required when adding a signer');
        }
        ctx.progress('Adding signer to contract...');
        result = await client.addSigner(contractId, {
          name: signer.name,
          email: signer.email,
          mobile: signer.mobile,
          companyName: signer.companyName,
          signingOrder: signer.signingOrder,
          signatureRequestDeliveryMethods: signer.signatureRequestDeliveryMethods,
          signedDocumentDeliveryMethod: signer.signedDocumentDeliveryMethod,
          multiFactorAuthentications: signer.multiFactorAuthentications,
          redirectUrl: signer.redirectUrl
        });
        message = `Signer **${signer.name}** added to contract **${contractId}**. Use "send" action to deliver the contract.`;
        break;
      }
      case 'update': {
        if (!signerId) {
          throw createApiServiceError('signerId is required for update action');
        }
        if (!signer || !Object.values(signer).some(value => value !== undefined)) {
          throw createApiServiceError('Provide signer fields to update.');
        }
        ctx.progress('Updating signer details...');
        result = await client.updateSigner(contractId, signerId, signer);
        message = `Signer **${signerId}** updated on contract **${contractId}**.`;
        break;
      }
      case 'delete': {
        if (!signerId) {
          throw createApiServiceError('signerId is required for delete action');
        }
        ctx.progress('Removing signer from contract...');
        result = await client.deleteSigner(contractId, signerId);
        message = `Signer **${signerId}** removed from contract **${contractId}**.`;
        break;
      }
      case 'send': {
        if (!signerId) {
          throw createApiServiceError('signerId is required for send action');
        }
        ctx.progress('Sending contract to signer...');
        result = await client.sendContract(contractId, signerId);
        message = `Contract **${contractId}** sent/resent to signer **${signerId}**.`;
        break;
      }
    }

    let signerData = result.data?.signer;

    return {
      output: {
        status: result.status,
        signerId: signerData?.id,
        signPageUrl: signerData?.signPageUrl
      },
      message
    };
  })
  .build();
