import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIps = SlateTool.create(spec, {
  name: 'List IP Addresses',
  key: 'list_ips',
  description: `Retrieves the current list of IP addresses used by DocRaptor to download external assets (CSS, images, etc.) during document conversion. Useful for configuring firewall whitelisting rules. Note that these IPs may change over time without notice.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      ipAddresses: z
        .array(z.string())
        .describe('List of IP addresses currently used by DocRaptor.'),
      count: z.number().describe('Number of IP addresses returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let ips = await client.listIps();

    return {
      output: {
        ipAddresses: ips,
        count: ips.length
      },
      message: `Retrieved **${ips.length}** IP address(es) used by DocRaptor.`
    };
  })
  .build();
