import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let realAddressInfoSchema = z.object({
  isEnabled: z.boolean().describe('Whether forwarding to this address is enabled'),
  isVerificationNeeded: z.boolean().describe('Whether a verification email was sent'),
  isVerified: z.boolean().describe('Whether the address has been verified')
});

export let updateProxyEmail = SlateTool.create(spec, {
  name: 'Update Proxy Email',
  key: 'update_proxy_email',
  description: `Update the configuration of an existing proxy email address. Change forwarding addresses, callback URL, description, or browsable status. Only provided fields are updated.`,
  instructions: [
    'The isBrowsable flag can only be changed if no emails have been received yet.',
    'To stop forwarding while keeping webhooks active, set realAddresses to ["int.proxiedmail.com"].'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      proxyBindingId: z.string().describe('ID of the proxy email binding to update'),
      realAddresses: z
        .array(z.string())
        .optional()
        .describe('Updated list of real email addresses for forwarding'),
      callbackUrl: z
        .string()
        .optional()
        .nullable()
        .describe('Updated webhook callback URL. Set to null to remove.'),
      description: z
        .string()
        .optional()
        .nullable()
        .describe('Updated description for the proxy email'),
      isBrowsable: z
        .boolean()
        .optional()
        .describe('Enable or disable API browsing of received emails')
    })
  )
  .output(
    z.object({
      proxyBindingId: z.string().describe('ID of the updated proxy email binding'),
      proxyAddress: z.string().describe('The proxy email address'),
      realAddresses: z
        .record(z.string(), realAddressInfoSchema)
        .describe('Updated forwarding addresses and their status'),
      isBrowsable: z.boolean().describe('Whether received emails can be browsed via the API'),
      description: z.string().nullable().describe('Updated description'),
      callbackUrl: z.string().nullable().describe('Updated webhook callback URL'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateProxyEmail(ctx.input.proxyBindingId, {
      realAddresses: ctx.input.realAddresses,
      callbackUrl: ctx.input.callbackUrl,
      description: ctx.input.description,
      isBrowsable: ctx.input.isBrowsable
    });

    return {
      output: {
        proxyBindingId: result.proxyBindingId,
        proxyAddress: result.proxyAddress,
        realAddresses: result.realAddresses,
        isBrowsable: result.isBrowsable,
        description: result.description,
        callbackUrl: result.callbackUrl,
        updatedAt: result.updatedAt
      },
      message: `Updated proxy email **${result.proxyAddress}** (ID: ${result.proxyBindingId}).`
    };
  })
  .build();
