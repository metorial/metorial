import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getKibanaStatus = SlateTool.create(spec, {
  name: 'Get Kibana Status',
  key: 'get_kibana_status',
  description: `Get the current status of the Kibana instance, including overall health, version, and plugin status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      overallStatus: z
        .string()
        .describe('Overall Kibana status (e.g., "green", "yellow", "red")'),
      version: z.string().optional().describe('Kibana version number'),
      buildNumber: z.number().optional().describe('Kibana build number'),
      buildHash: z.string().optional().describe('Kibana build hash'),
      pluginStatuses: z
        .array(
          z.object({
            pluginName: z.string().describe('Plugin name'),
            level: z.string().describe('Status level'),
            summary: z.string().optional().describe('Status summary')
          })
        )
        .optional()
        .describe('Status of individual plugins')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let status = await client.getStatus();

    let overall = status.status?.overall?.level ?? status.status?.overall?.state ?? 'unknown';
    let version = status.version?.number;
    let buildNumber = status.version?.build_number;
    let buildHash = status.version?.build_hash;

    let pluginStatuses = status.status?.statuses
      ? Object.entries(status.status.statuses as Record<string, any>).map(
          ([key, val]: [string, any]) => ({
            pluginName: key,
            level: val.level ?? val.state ?? 'unknown',
            summary: val.summary ?? val.message
          })
        )
      : undefined;

    return {
      output: {
        overallStatus: overall,
        version,
        buildNumber,
        buildHash,
        pluginStatuses
      },
      message: `Kibana status: **${overall}**${version ? ` (v${version})` : ''}.`
    };
  })
  .build();
