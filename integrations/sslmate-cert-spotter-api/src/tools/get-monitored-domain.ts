import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertSpotterClient } from '../lib/client';
import { spec } from '../spec';

export let getMonitoredDomain = SlateTool.create(spec, {
  name: 'Get Monitored Domain',
  key: 'get_monitored_domain',
  description:
    'Retrieve the monitoring setting for one configured domain. Use list_monitored_domains to find domain names, including leading-dot names that monitor a domain tree.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainName: z
        .string()
        .describe(
          'Monitored domain name from list_monitored_domains, preserving any leading dot'
        )
    })
  )
  .output(
    z.object({
      domainName: z.string().describe('Configured monitored domain name'),
      enabled: z.boolean().describe('Whether monitoring is active for this domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertSpotterClient({ token: ctx.auth.token });
    let domain = await client.getMonitoredDomain(ctx.input.domainName);
    return {
      output: {
        domainName: domain.name,
        enabled: domain.enabled
      },
      message: `Domain **${domain.name}** is ${domain.enabled ? 'actively monitored' : 'disabled'}.`
    };
  })
  .build();
