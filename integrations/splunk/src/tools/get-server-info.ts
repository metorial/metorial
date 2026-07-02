import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSplunkClient } from '../lib/helpers';
import { spec } from '../spec';

export let getServerInfo = SlateTool.create(spec, {
  name: 'Get Server Info',
  key: 'get_server_info',
  description: `Retrieve Splunk server information including server name, version, build number, OS, CPU architecture, and license state. Useful for verifying connectivity and server status.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      serverName: z.string().optional(),
      version: z.string().optional(),
      build: z.string().optional(),
      cpuArch: z.string().optional(),
      os: z.string().optional(),
      isFree: z.any().optional(),
      isTrial: z.any().optional(),
      licenseState: z.string().optional(),
      guid: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let result = await client.getServerInfo();

    return {
      output: result,
      message: `Splunk server **${result.serverName}** running version **${result.version}** (${result.os} / ${result.cpuArch}).`
    };
  })
  .build();
