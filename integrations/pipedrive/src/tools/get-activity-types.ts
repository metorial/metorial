import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return undefined;
};

export let getActivityTypes = SlateTool.create(spec, {
  name: 'Get Activity Types',
  key: 'get_activity_types',
  description: `Retrieve Pipedrive activity types. Use this to discover the activity type keys accepted by activity create and update operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      activityTypes: z
        .array(
          z.object({
            activityTypeId: z.number().describe('Activity type ID'),
            name: z.string().optional().describe('Activity type name'),
            keyString: z
              .string()
              .optional()
              .describe('Activity type key used as activity type'),
            iconKey: z.string().optional().nullable().describe('Icon key'),
            color: z.string().optional().nullable().describe('Color'),
            orderNr: z.number().optional().describe('Display order'),
            activeFlag: z.boolean().optional().describe('Whether active'),
            isCustomFlag: z.boolean().optional().describe('Whether this is a custom type')
          })
        )
        .describe('Activity types')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getActivityTypes();
    let activityTypes = (result?.data || []).map((activityType: any) => ({
      activityTypeId: activityType.id,
      name: activityType.name,
      keyString: activityType.key_string,
      iconKey: activityType.icon_key,
      color: activityType.color,
      orderNr: activityType.order_nr,
      activeFlag: toBoolean(activityType.active_flag),
      isCustomFlag: toBoolean(activityType.is_custom_flag)
    }));

    return {
      output: { activityTypes },
      message: `Found **${activityTypes.length}** activity type(s).`
    };
  });
