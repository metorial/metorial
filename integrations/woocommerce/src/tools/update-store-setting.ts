import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateStoreSetting = SlateTool.create(spec, {
  name: 'Update Store Setting',
  key: 'update_store_setting',
  description: `Update a specific store setting value. Use the Get Store Settings tool first to discover setting group IDs and setting IDs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('Setting group ID (e.g., "general", "products")'),
      settingId: z.string().describe('The specific setting ID within the group'),
      value: z.any().describe('New value for the setting')
    })
  )
  .output(
    z.object({
      settingId: z.string(),
      label: z.string(),
      value: z.any(),
      groupId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.updateSetting(
      ctx.input.groupId,
      ctx.input.settingId,
      ctx.input.value
    );

    return {
      output: {
        settingId: result.id || '',
        label: result.label || '',
        value: result.value ?? '',
        groupId: ctx.input.groupId
      },
      message: `Updated setting **"${result.label || ctx.input.settingId}"** in group "${ctx.input.groupId}".`
    };
  })
  .build();
