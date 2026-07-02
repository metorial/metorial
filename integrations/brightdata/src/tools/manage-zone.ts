import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let manageZone = SlateTool.create(spec, {
  name: 'Manage Zone',
  key: 'manage_zone',
  description: `Create, enable, disable, or delete a Bright Data zone. Zones are isolated proxy/scraping configurations with their own plan, credentials, and settings. Use this tool to manage the lifecycle of zones in your account.`,
  instructions: [
    'To create a zone, provide "action" as "create" with zoneName, zoneType, and planConfig.',
    'To enable or disable a zone, provide "action" as "enable" or "disable" with the zoneName.',
    'To delete a zone, provide "action" as "delete" with the zoneName.',
    'Zone names cannot be changed after creation.'
  ],
  constraints: [
    'Creating or deleting zones may affect billing and operations.',
    'Only Admin-level API keys can create or delete zones.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'enable', 'disable', 'delete'])
        .describe('The action to perform on the zone.'),
      zoneName: z.string().describe('Name of the zone to manage.'),
      zoneType: z
        .string()
        .optional()
        .describe(
          'Type of zone to create (e.g., "serp", "dc", "residential", "isp", "mobile", "unblocker"). Required for "create" action.'
        ),
      planConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Plan configuration for zone creation. Includes fields like "type" (static/resident/unblocker/browser_api), "bandwidth", "ips_type", "country", etc. Required for "create" action.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action completed successfully.'),
      message: z.string().describe('Description of what was done.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });
    let { action, zoneName } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.planConfig) {
        throw new Error('planConfig is required when creating a zone.');
      }
      await client.createZone({
        name: zoneName,
        type: ctx.input.zoneType,
        plan: ctx.input.planConfig
      });
      return {
        output: { success: true, message: `Zone "${zoneName}" created successfully.` },
        message: `Zone **${zoneName}** created successfully.`
      };
    }

    if (action === 'enable' || action === 'disable') {
      await client.toggleZone(zoneName, action === 'enable');
      return {
        output: { success: true, message: `Zone "${zoneName}" ${action}d successfully.` },
        message: `Zone **${zoneName}** ${action}d.`
      };
    }

    if (action === 'delete') {
      await client.deleteZone(zoneName);
      return {
        output: { success: true, message: `Zone "${zoneName}" deleted successfully.` },
        message: `Zone **${zoneName}** deleted.`
      };
    }

    return {
      output: { success: false, message: `Unknown action: ${action}` },
      message: `Unknown action: ${action}`
    };
  })
  .build();
