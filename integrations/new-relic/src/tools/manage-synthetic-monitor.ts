import { createApiServiceError, SlateTool } from 'slates';
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
  description: `Create, update, or delete synthetic monitors. Synthetics simulate user interactions or API calls to proactively detect availability and performance issues.
Supports ping monitors, simple browser monitors, scripted browser tests, and scripted API tests.`,
  instructions: [
    'To create: provide `action: "create"`, `name`, `monitorType`, `period`, `status`, and `locations`.',
    'To update: provide `action: "update"`, `monitorGuid`, `monitorType`, and the fields to change.',
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
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
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
        .describe('Script content for SCRIPT_BROWSER or SCRIPT_API monitors'),
      runtimeTypeVersion: z
        .string()
        .optional()
        .describe('Runtime version for browser/API monitor types, e.g. LATEST or 22.20.0'),
      browsers: z
        .array(z.enum(['CHROME', 'FIREFOX']))
        .optional()
        .describe('Browser engines for SIMPLE_BROWSER or SCRIPT_BROWSER monitors'),
      devices: z
        .array(
          z.enum([
            'DESKTOP',
            'MOBILE_LANDSCAPE',
            'MOBILE_PORTRAIT',
            'TABLET_LANDSCAPE',
            'TABLET_PORTRAIT'
          ])
        )
        .optional()
        .describe('Device profiles for SIMPLE_BROWSER or SCRIPT_BROWSER monitors'),
      apdexTarget: z.number().optional().describe('Monitor Apdex target in seconds'),
      advancedOptions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Advanced synthetics options supported by the selected monitor type')
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
      if (!ctx.input.monitorGuid)
        throw createApiServiceError('monitorGuid is required for delete action');
      ctx.progress('Deleting synthetic monitor...');
      await client.deleteSyntheticMonitor(ctx.input.monitorGuid);
      return {
        output: { monitorGuid: ctx.input.monitorGuid, deleted: true },
        message: `Synthetic monitor **${ctx.input.monitorGuid}** deleted successfully.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.monitorGuid)
        throw createApiServiceError('monitorGuid is required for update action');
      if (!ctx.input.monitorType)
        throw createApiServiceError('monitorType is required for update action');

      ctx.progress('Updating synthetic monitor...');
      let result = await client.updateSyntheticMonitor(ctx.input.monitorGuid, {
        type: ctx.input.monitorType,
        name: ctx.input.name,
        uri: ctx.input.uri,
        period: ctx.input.period,
        status: ctx.input.status,
        locations: ctx.input.locations ? { public: ctx.input.locations } : undefined,
        script: ctx.input.script,
        runtimeTypeVersion: ctx.input.runtimeTypeVersion,
        browsers: ctx.input.browsers,
        devices: ctx.input.devices,
        apdexTarget: ctx.input.apdexTarget,
        advancedOptions: ctx.input.advancedOptions
      });

      return {
        output: {
          monitorGuid: result?.guid || ctx.input.monitorGuid,
          name: result?.name,
          status: result?.status,
          period: result?.period,
          uri: result?.uri,
          locations: result?.locations?.public
        },
        message: `Synthetic monitor **${result?.name || ctx.input.monitorGuid}** updated successfully.`
      };
    }

    if (!ctx.input.name) throw createApiServiceError('name is required for create action');
    if (!ctx.input.monitorType)
      throw createApiServiceError('monitorType is required for create action');
    if (!ctx.input.period) throw createApiServiceError('period is required for create action');
    if (!ctx.input.locations?.length)
      throw createApiServiceError('At least one location is required for create action');
    if (
      (ctx.input.monitorType === 'SIMPLE' || ctx.input.monitorType === 'SIMPLE_BROWSER') &&
      !ctx.input.uri
    ) {
      throw createApiServiceError('uri is required for SIMPLE and SIMPLE_BROWSER monitors');
    }
    if (
      (ctx.input.monitorType === 'SCRIPT_BROWSER' || ctx.input.monitorType === 'SCRIPT_API') &&
      !ctx.input.script
    ) {
      throw createApiServiceError(
        'script is required for SCRIPT_BROWSER and SCRIPT_API monitors'
      );
    }

    ctx.progress('Creating synthetic monitor...');
    let result = await client.createSyntheticMonitor({
      name: ctx.input.name,
      type: ctx.input.monitorType,
      uri: ctx.input.uri,
      period: ctx.input.period,
      status: ctx.input.status || 'ENABLED',
      locations: { public: ctx.input.locations },
      script: ctx.input.script,
      runtimeTypeVersion: ctx.input.runtimeTypeVersion,
      browsers: ctx.input.browsers,
      devices: ctx.input.devices,
      apdexTarget: ctx.input.apdexTarget,
      advancedOptions: ctx.input.advancedOptions
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
