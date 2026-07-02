import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertSpotterClient } from '../lib/client';
import { spec } from '../spec';

export let manageMonitoredDomain = SlateTool.create(spec, {
  name: 'Manage Monitored Domain',
  key: 'manage_monitored_domain',
  description: `Add, update, enable, disable, or remove a domain from Cert Spotter monitoring.
Use this to configure which domains Cert Spotter watches for new certificate issuances. Prefix a domain with a dot (e.g. ".example.com") to monitor the entire subdomain tree, or use a bare domain name to monitor just that specific name.`,
  instructions: [
    'Use **action** "upsert" to add a new domain or update an existing one.',
    'Use **action** "delete" to remove a domain from monitoring entirely.',
    'Prefix the domain name with a dot (e.g. ".example.com") to monitor the entire subdomain tree.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['upsert', 'delete'])
        .describe('Action to perform: "upsert" to add/update, "delete" to remove'),
      domainName: z
        .string()
        .describe(
          'Domain name to manage. Prefix with "." (e.g. ".example.com") to include all subdomains'
        ),
      enabled: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether monitoring is active (only used for upsert)')
    })
  )
  .output(
    z.object({
      domainName: z.string().describe('The monitored domain name'),
      enabled: z.boolean().optional().describe('Whether monitoring is currently active'),
      deleted: z.boolean().describe('Whether the domain was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertSpotterClient({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      await client.deleteMonitoredDomain(ctx.input.domainName);
      return {
        output: {
          domainName: ctx.input.domainName,
          deleted: true
        },
        message: `Removed **${ctx.input.domainName}** from monitored domains.`
      };
    }

    let domain = await client.upsertMonitoredDomain(ctx.input.domainName, {
      enabled: ctx.input.enabled
    });

    return {
      output: {
        domainName: domain.name,
        enabled: domain.enabled,
        deleted: false
      },
      message: `Domain **${domain.name}** is now ${domain.enabled ? 'actively monitored' : 'disabled'}.`
    };
  })
  .build();
