import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSenderDomains = SlateTool.create(spec, {
  name: 'List Sender Domains',
  key: 'list_sender_domains',
  description: `List all sender domains configured in your SMTP2GO account, including their verification status for SPF and DKIM.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subaccountId: z.string().optional().describe('Subaccount ID to list domains for')
    })
  )
  .output(
    z.object({
      domains: z.array(z.any()).describe('List of sender domains with verification details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.viewDomains({
      subaccountId: ctx.input.subaccountId
    });
    let data = result.data || result;

    return {
      output: {
        domains: data.domains || data
      },
      message: `Retrieved sender domains.`
    };
  })
  .build();

export let addSenderDomain = SlateTool.create(spec, {
  name: 'Add Sender Domain',
  key: 'add_sender_domain',
  description: `Add a new sender domain to your SMTP2GO account. Verifying a sender domain enables SPF and DKIM authentication for all addresses at that domain. Optionally configure tracking and return-path subdomains.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to add (e.g. "example.com")'),
      trackingSubdomain: z.string().optional().describe('Subdomain for open/click tracking'),
      returnpathSubdomain: z.string().optional().describe('Subdomain for return path'),
      autoVerify: z.boolean().optional().describe('Automatically attempt DNS verification'),
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      domain: z.any().describe('Added domain details with verification records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.addDomain(ctx.input);
    let data = result.data || result;

    return {
      output: {
        domain: data
      },
      message: `Sender domain **${ctx.input.domain}** added. Configure the provided DNS records to complete verification.`
    };
  })
  .build();

export let removeSenderDomain = SlateTool.create(spec, {
  name: 'Remove Sender Domain',
  key: 'remove_sender_domain',
  description: `Remove a sender domain from your SMTP2GO account. Emails can no longer be sent from addresses at this domain after removal.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to remove'),
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Removed domain name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.removeDomain(ctx.input);

    return {
      output: {
        domain: ctx.input.domain
      },
      message: `Sender domain **${ctx.input.domain}** removed.`
    };
  })
  .build();

export let verifySenderDomain = SlateTool.create(spec, {
  name: 'Verify Sender Domain',
  key: 'verify_sender_domain',
  description: `Verify a sender domain's DNS records for SPF and DKIM authentication. The domain must already be added to your account.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to verify'),
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      verificationResult: z.any().describe('Verification result including SPF and DKIM status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.verifyDomain(ctx.input);
    let data = result.data || result;

    return {
      output: {
        verificationResult: data
      },
      message: `Verification check completed for domain **${ctx.input.domain}**.`
    };
  })
  .build();
