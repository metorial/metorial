import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let iocStream = SlateTrigger.create(spec, {
  name: 'IoC Stream',
  key: 'ioc_stream',
  description:
    'Polls the VirusTotal IOC Stream for new Livehunt notifications. Detects when YARA rules match newly submitted files, URLs, domains, or IP addresses. Premium feature.'
})
  .input(
    z.object({
      notificationId: z.string().describe('Unique notification ID'),
      notificationType: z
        .string()
        .describe('Type of the matched object (e.g. "file", "url", "domain", "ip_address")'),
      rulesetName: z.string().optional().describe('Name of the Livehunt ruleset that matched'),
      rulesetId: z.string().optional().describe('ID of the Livehunt ruleset that matched'),
      matchDate: z.string().optional().describe('Date the match occurred (Unix timestamp)'),
      resourceId: z.string().optional().describe('ID of the matched resource'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Attributes of the matched resource'),
      tags: z.array(z.string()).optional().describe('Tags on the matched resource')
    })
  )
  .output(
    z.object({
      notificationId: z.string().describe('Unique notification ID'),
      notificationType: z.string().describe('Type of the matched object'),
      rulesetName: z.string().optional().describe('Name of the Livehunt ruleset that matched'),
      rulesetId: z.string().optional().describe('ID of the Livehunt ruleset'),
      matchDate: z.string().optional().describe('Date the match occurred'),
      resourceId: z
        .string()
        .optional()
        .describe('ID of the matched resource (e.g. file hash, domain)'),
      sha256: z.string().optional().describe('SHA-256 hash if the matched resource is a file'),
      meaningfulName: z
        .string()
        .optional()
        .describe('Meaningful name if the matched resource is a file'),
      reputation: z.number().optional().describe('Community reputation score'),
      tags: z.array(z.string()).optional().describe('Tags on the matched resource'),
      detectionStats: z
        .object({
          malicious: z.number().optional(),
          undetected: z.number().optional()
        })
        .optional()
        .describe('Detection statistics if available')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let cursor = ctx.state?.cursor as string | undefined;
      let result = await client.getIocStream(undefined, 20, cursor);
      let items = result?.data ?? [];

      let inputs = items.map((item: any) => ({
        notificationId: item.id ?? '',
        notificationType: item.type ?? 'unknown',
        rulesetName: item.context_attributes?.ruleset_name,
        rulesetId: item.context_attributes?.ruleset_id,
        matchDate: item.context_attributes?.notification_date?.toString(),
        resourceId: item.id,
        attributes: item.attributes,
        tags: item.attributes?.tags
      }));

      return {
        inputs,
        updatedState: {
          cursor: result?.meta?.cursor ?? cursor
        }
      };
    },

    handleEvent: async ctx => {
      let attrs = (ctx.input.attributes ?? {}) as Record<string, any>;
      let stats = attrs.last_analysis_stats as Record<string, any> | undefined;

      return {
        type: `ioc.${ctx.input.notificationType}`,
        id: ctx.input.notificationId,
        output: {
          notificationId: ctx.input.notificationId,
          notificationType: ctx.input.notificationType,
          rulesetName: ctx.input.rulesetName,
          rulesetId: ctx.input.rulesetId,
          matchDate: ctx.input.matchDate,
          resourceId: ctx.input.resourceId,
          sha256: attrs.sha256 as string | undefined,
          meaningfulName: attrs.meaningful_name as string | undefined,
          reputation: attrs.reputation as number | undefined,
          tags: ctx.input.tags,
          detectionStats: stats
            ? {
                malicious: stats.malicious as number | undefined,
                undetected: stats.undetected as number | undefined
              }
            : undefined
        }
      };
    }
  })
  .build();
