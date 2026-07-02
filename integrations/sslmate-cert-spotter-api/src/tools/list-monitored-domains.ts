import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertSpotterClient } from '../lib/client';
import { spec } from '../spec';

export let listMonitoredDomains = SlateTool.create(spec, {
  name: 'List Monitored Domains',
  key: 'list_monitored_domains',
  description: `Retrieve all domains currently configured for Cert Spotter certificate monitoring. Returns each domain's name and whether monitoring is enabled or disabled.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            domainName: z.string().describe('The monitored domain name'),
            enabled: z.boolean().describe('Whether monitoring is active for this domain')
          })
        )
        .describe('List of all monitored domains'),
      totalCount: z.number().describe('Total number of monitored domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertSpotterClient({ token: ctx.auth.token });

    let domains = await client.listMonitoredDomains();

    let mapped = domains.map(d => ({
      domainName: d.name,
      enabled: d.enabled
    }));

    let enabledCount = mapped.filter(d => d.enabled).length;

    return {
      output: {
        domains: mapped,
        totalCount: mapped.length
      },
      message: `Found **${mapped.length}** monitored domain(s), **${enabledCount}** actively monitored.`
    };
  })
  .build();
