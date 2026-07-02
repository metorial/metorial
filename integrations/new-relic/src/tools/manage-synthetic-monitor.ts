import { SlateTool } from 'slates';
import { z } from 'zod';
import { NerdGraphClient } from '../lib/client';
import { spec } from '../spec';

let monitorOutputSchema = z.object({
  monitorGuid: z.string().optional().describe('Monitor entity GUID'),
  name: z.string().optional().describe('Monitor name'),
  status: z.string().optional().describe('Monitor status (ENABLED or DISABLED)'),
  period: z.string().optional().describe('Check frequency'),
  uri: z.string().optional().describe('Target URI being monitored'),
  locations: z
    .array(z.string())
    .optional()
    .describe('Public locations where the monitor runs'),
  deleted: z.boolean().optional().describe('Whether the monitor was deleted')
});

export let manageSyntheticMonitor = SlateTool.create(spec, {
  name: 'Manage Synthetic Monitor',
  key: 'manage_synthetic_monitor',
  description: `Create or delete synthetic monitors. Synthetics simulate user interactions or API calls to proactively detect availability and performance issues.
Supports ping monitors, simple browser monitors, scripted browser tests, and scripted API tests.`,
  instructions: [
    'To create: provide `action: "create"`, `name`, `monitorType`, `period`, `status`, and `locations`.',
    'To delete: provide `action: "delete"` and the `monitorGuid`.',
    'Monitor types: `SIMPLE` (ping), `SIMPLE_BROWSER`, `SCRIPT_BROWSER`, `SCRIPT_API`.',
    'Periods: `EVERY_MINUTE`, `EVERY_5_MINUTES`, `EVERY_10_MINUTES`, `EVERY_15_MINUTES`, `EVERY_30_MINUTES`, `EVERY_HOUR`, `EVERY_6_HOURS`, `EVERY_12_HOURS`, `EVERY_DAY`.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      monitorGuid: z.string().optional().describe('Monitor entity GUID (required for delete)'),
      name: z.string().optional().describe('Monitor name (required for create)'),
      monitorType: z
        .enum(['SIMPLE', 'SIMPLE_BROWSER', 'SCRIPT_BROWSER', 'SCRIPT_API'])
        .optional()
        .describe('Type of synthetic monitor'),
      uri: z
        .string()
        .optional()
        .describe('Target URI to monitor (required for SIMPLE and SIMPLE_BROWSER)'),
      period: z
        .enum([
          'EVERY_MINUTE',
          'EVERY_5_MINUTES',
          'EVERY_10_MINUTES',
          'EVERY_15_MINUTES',
          'EVERY_30_MINUTES',
          'EVERY_HOUR',
          'EVERY_6_HOURS',
          'EVERY_12_HOURS',
          'EVERY_DAY'
        ])
        .optional()
        .describe('How often the monitor runs'),
      status: z
        .enum(['ENABLED', 'DISABLED'])
        .optional()
        .default('ENABLED')
        .describe('Monitor status'),
      locations: z
        .array(z.string())
        .optional()
        .describe('Public locations to run the monitor from, e.g. ["US_EAST_1", "EU_WEST_1"]'),
      script: z
        .string()
        .optional()
        .describe('Script content for SCRIPT_BROWSER or SCRIPT_API monitors')
    })
  )
  .output(monitorOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NerdGraphClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      accountId: ctx.config.accountId
    });

    let { action } = ctx.input;

    if (action === 'delete') {
      if (!ctx.input.monitorGuid) throw new Error('monitorGuid is required for delete action');
      ctx.progress('Deleting synthetic monitor...');
      await client.deleteSyntheticMonitor(ctx.input.monitorGuid);
      return {
        output: { monitorGuid: ctx.input.monitorGuid, deleted: true },
        message: `Synthetic monitor **${ctx.input.monitorGuid}** deleted successfully.`
      };
    }

    // create
    if (!ctx.input.name) throw new Error('name is required for create action');
    if (!ctx.input.monitorType) throw new Error('monitorType is required for create action');
    if (!ctx.input.period) throw new Error('period is required for create action');
    if (!ctx.input.locations?.length)
      throw new Error('At least one location is required for create action');

    ctx.progress('Creating synthetic monitor...');
    let result = await client.createSyntheticMonitor({
      name: ctx.input.name,
      type: ctx.input.monitorType,
      uri: ctx.input.uri,
      period: ctx.input.period,
      status: ctx.input.status || 'ENABLED',
      locations: { public: ctx.input.locations },
      script: ctx.input.script
    });

    return {
      output: {
        monitorGuid: result?.guid,
        name: result?.name,
        status: result?.status,
        period: result?.period,
        uri: result?.uri,
        locations: result?.locations?.public
      },
      message: `Synthetic monitor **${result?.name}** created successfully with GUID **${result?.guid}**.`
    };
  })
  .build();
