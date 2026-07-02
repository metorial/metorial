import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let realAddressInfoSchema = z.object({
  isEnabled: z.boolean().describe('Whether forwarding to this address is enabled'),
  isVerificationNeeded: z.boolean().describe('Whether a verification email was sent'),
  isVerified: z.boolean().describe('Whether the address has been verified')
});

let proxyBindingSchema = z.object({
  proxyBindingId: z.string().describe('Unique ID of the proxy email binding'),
  proxyAddress: z.string().describe('The proxy email address'),
  realAddresses: z
    .record(z.string(), realAddressInfoSchema)
    .describe('Map of forwarding addresses and their status'),
  isBrowsable: z.boolean().describe('Whether received emails can be browsed via the API'),
  receivedEmailsCount: z.number().describe('Number of emails received by this proxy address'),
  description: z.string().nullable().describe('User-provided description'),
  callbackUrl: z.string().nullable().describe('Webhook callback URL'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listProxyEmails = SlateTool.create(spec, {
  name: 'List Proxy Emails',
  key: 'list_proxy_emails',
  description: `Retrieve all proxy email addresses (aliases) for the authenticated user, including their forwarding configuration, callback URLs, and usage statistics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      bindings: z.array(proxyBindingSchema).describe('List of proxy email bindings'),
      usedProxyBindings: z.number().describe('Number of proxy emails currently in use'),
      availableProxyBindings: z.number().describe('Maximum number of proxy emails available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProxyEmails();

    return {
      output: {
        bindings: result.bindings,
        usedProxyBindings: result.meta.usedProxyBindings,
        availableProxyBindings: result.meta.availableProxyBindings
      },
      message: `Found **${result.bindings.length}** proxy email(s). Using ${result.meta.usedProxyBindings} of ${result.meta.availableProxyBindings} available.`
    };
  })
  .build();
