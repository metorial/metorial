import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateZoneSettingsTool = SlateTool.create(spec, {
  name: 'Update Zone Settings',
  key: 'update_zone_settings',
  description: `Get or update zone-level settings such as SSL/TLS mode, security level, caching, minification, development mode, and more. Can retrieve all current settings or update a specific one.`,
  instructions: [
    'To list all settings, set action to "list".',
    'To update a setting, set action to "update" and provide settingId and value.',
    'Common setting IDs: ssl, security_level, cache_level, minify, development_mode, always_use_https, automatic_https_rewrites, browser_cache_ttl.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'update'])
        .describe('Whether to list all settings or update one'),
      zoneId: z.string().describe('Zone ID'),
      settingId: z
        .string()
        .optional()
        .describe('Setting identifier to update (e.g. ssl, security_level, development_mode)'),
      value: z.any().optional().describe('New value for the setting')
    })
  )
  .output(
    z.object({
      settings: z
        .array(
          z.object({
            settingId: z.string(),
            value: z.any(),
            editable: z.boolean().optional(),
            modifiedOn: z.string().optional().nullable()
          })
        )
        .optional(),
      updatedSetting: z
        .object({
          settingId: z.string(),
          value: z.any()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.action === 'list') {
      let response = await client.getZoneSettings(ctx.input.zoneId);
      let settings = response.result.map((s: any) => ({
        settingId: s.id,
        value: s.value,
        editable: s.editable,
        modifiedOn: s.modified_on
      }));

      return {
        output: { settings },
        message: `Retrieved **${settings.length}** zone settings.`
      };
    }

    if (!ctx.input.settingId) throw cloudflareServiceError('settingId is required for update');
    if (ctx.input.value === undefined)
      throw cloudflareServiceError('value is required for update');

    let response = await client.updateZoneSetting(
      ctx.input.zoneId,
      ctx.input.settingId,
      ctx.input.value
    );
    return {
      output: {
        updatedSetting: {
          settingId: response.result.id,
          value: response.result.value
        }
      },
      message: `Updated setting **${response.result.id}** to \`${JSON.stringify(response.result.value)}\`.`
    };
  })
  .build();
