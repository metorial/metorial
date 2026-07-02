import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let realAddressInfoSchema = z.object({
  isEnabled: z.boolean().describe('Whether forwarding to this address is enabled'),
  isVerificationNeeded: z.boolean().describe('Whether a verification email was sent'),
  isVerified: z.boolean().describe('Whether the address has been verified')
});

export let createProxyEmail = SlateTool.create(spec, {
  name: 'Create Proxy Email',
  key: 'create_proxy_email',
  description: `Create a new proxy email address (alias) that forwards incoming messages to one or more real email addresses. The proxy address is auto-generated on a ProxiedMail domain unless specified. Optionally enable email browsing via the API and configure a webhook callback URL for incoming mail notifications.`,
  instructions: [
    'To receive webhook callbacks without forwarding, set realAddresses to ["int.proxiedmail.com"].',
    'Set isBrowsable to true if you want to later read received emails through the API.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      realAddresses: z
        .array(z.string())
        .optional()
        .describe(
          'Real email addresses to forward incoming mail to. Leave empty for no forwarding.'
        ),
      proxyAddress: z
        .string()
        .optional()
        .nullable()
        .describe(
          'Desired proxy email address. Leave empty to auto-generate one on a ProxiedMail domain.'
        ),
      isBrowsable: z
        .boolean()
        .optional()
        .describe('Enable browsing received emails via the API. Defaults to false.'),
      callbackUrl: z
        .string()
        .optional()
        .nullable()
        .describe(
          'Webhook URL to receive HTTP POST notifications when emails arrive at this proxy address.'
        )
    })
  )
  .output(
    z.object({
      proxyBindingId: z.string().describe('Unique ID of the created proxy email binding'),
      proxyAddress: z.string().describe('The generated or specified proxy email address'),
      realAddresses: z
        .record(z.string(), realAddressInfoSchema)
        .describe('Map of real email addresses and their verification status'),
      isBrowsable: z.boolean().describe('Whether received emails can be browsed via the API'),
      callbackUrl: z.string().nullable().describe('Configured webhook callback URL'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createProxyEmail({
      realAddresses: ctx.input.realAddresses,
      proxyAddress: ctx.input.proxyAddress,
      isBrowsable: ctx.input.isBrowsable,
      callbackUrl: ctx.input.callbackUrl
    });

    return {
      output: {
        proxyBindingId: result.proxyBindingId,
        proxyAddress: result.proxyAddress,
        realAddresses: result.realAddresses,
        isBrowsable: result.isBrowsable,
        callbackUrl: result.callbackUrl,
        createdAt: result.createdAt
      },
      message: `Created proxy email **${result.proxyAddress}** (ID: ${result.proxyBindingId}). Browsable: ${result.isBrowsable}. Forwarding to ${Object.keys(result.realAddresses).length} address(es).`
    };
  })
  .build();
