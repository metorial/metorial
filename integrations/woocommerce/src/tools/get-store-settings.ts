import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let settingSchema = z.object({
  settingId: z.string(),
  label: z.string(),
  description: z.string(),
  type: z.string(),
  value: z.any(),
  defaultValue: z.any(),
  options: z.record(z.string(), z.string()).optional()
});

export let getStoreSettings = SlateTool.create(spec, {
  name: 'Get Store Settings',
  key: 'get_store_settings',
  description: `View store settings organized by group (general, products, tax, shipping, checkout, account, email). List all setting groups or retrieve settings within a specific group.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z
        .string()
        .optional()
        .describe(
          'Setting group ID (e.g., "general", "products", "tax"). Omit to list all available groups.'
        )
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string(),
            label: z.string(),
            description: z.string()
          })
        )
        .optional()
        .describe('Available setting groups (when no groupId specified)'),
      settings: z
        .array(settingSchema)
        .optional()
        .describe('Settings within the requested group')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (!ctx.input.groupId) {
      let groups = await client.listSettingGroups();
      let mapped = (Array.isArray(groups) ? groups : []).map((g: any) => ({
        groupId: g.id || '',
        label: g.label || '',
        description: g.description || ''
      }));

      return {
        output: { groups: mapped },
        message: `Found **${mapped.length}** setting groups.`
      };
    }

    let settings = await client.getSettingGroup(ctx.input.groupId);
    let mapped = (Array.isArray(settings) ? settings : []).map((s: any) => ({
      settingId: s.id || '',
      label: s.label || '',
      description: s.description || '',
      type: s.type || '',
      value: s.value ?? '',
      defaultValue: s.default ?? '',
      options: s.options || undefined
    }));

    return {
      output: { settings: mapped },
      message: `Retrieved **${mapped.length}** settings in group "${ctx.input.groupId}".`
    };
  })
  .build();
