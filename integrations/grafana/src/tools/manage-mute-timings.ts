import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

let muteTimeIntervalSchema = z
  .record(z.string(), z.any())
  .describe(
    'Grafana mute time interval object, such as {"weekdays":["saturday","sunday"]} or {"times":[{"start_time":"22:00","end_time":"23:59"}]}.'
  );

let mapMuteTiming = (timing: any) => ({
  name: timing.name,
  timeIntervals: timing.time_intervals || timing.timeIntervals || [],
  version: timing.version,
  provenance: timing.provenance
});

export let listMuteTimings = SlateTool.create(spec, {
  name: 'List Mute Timings',
  key: 'list_mute_timings',
  description: `List alert notification mute timings configured in Grafana. Mute timings define recurring time windows that notification policies can use to suppress alerts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      muteTimings: z.array(
        z.object({
          name: z.string().describe('Mute timing name'),
          timeIntervals: z.array(z.any()).describe('Configured mute intervals'),
          version: z.string().optional().describe('Version identifier'),
          provenance: z.string().optional().describe('Provisioning provenance')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let muteTimings = (await client.listMuteTimings()).map(mapMuteTiming);

    return {
      output: { muteTimings },
      message: `Found **${muteTimings.length}** mute timing(s).`
    };
  })
  .build();

export let getMuteTiming = SlateTool.create(spec, {
  name: 'Get Mute Timing',
  key: 'get_mute_timing',
  description: `Retrieve a mute timing by name, including its configured recurring time intervals and provenance.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the mute timing to retrieve')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Mute timing name'),
      timeIntervals: z.array(z.any()).describe('Configured mute intervals'),
      version: z.string().optional().describe('Version identifier'),
      provenance: z.string().optional().describe('Provisioning provenance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let muteTiming = mapMuteTiming(await client.getMuteTiming(ctx.input.name));

    return {
      output: muteTiming,
      message: `Retrieved mute timing **${muteTiming.name}**.`
    };
  })
  .build();

export let createMuteTiming = SlateTool.create(spec, {
  name: 'Create Mute Timing',
  key: 'create_mute_timing',
  description: `Create a mute timing for Grafana alert notification policies. Use this to define reusable quiet hours or maintenance windows.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Unique mute timing name'),
      timeIntervals: z
        .array(muteTimeIntervalSchema)
        .describe('One or more Grafana mute time interval objects')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Created mute timing name'),
      timeIntervals: z.array(z.any()).describe('Configured mute intervals'),
      version: z.string().optional().describe('Version identifier'),
      provenance: z.string().optional().describe('Provisioning provenance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let muteTiming = mapMuteTiming(
      await client.createMuteTiming({
        name: ctx.input.name,
        time_intervals: ctx.input.timeIntervals
      })
    );

    return {
      output: muteTiming,
      message: `Mute timing **${ctx.input.name}** created.`
    };
  })
  .build();

export let updateMuteTiming = SlateTool.create(spec, {
  name: 'Update Mute Timing',
  key: 'update_mute_timing',
  description: `Replace an existing mute timing by name. The provided intervals replace the current mute timing definition.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the mute timing to replace'),
      timeIntervals: z
        .array(muteTimeIntervalSchema)
        .describe('Replacement Grafana mute time interval objects')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Updated mute timing name'),
      timeIntervals: z.array(z.any()).describe('Configured mute intervals'),
      version: z.string().optional().describe('Version identifier'),
      provenance: z.string().optional().describe('Provisioning provenance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let muteTiming = mapMuteTiming(
      await client.updateMuteTiming(ctx.input.name, {
        name: ctx.input.name,
        time_intervals: ctx.input.timeIntervals
      })
    );

    return {
      output: muteTiming,
      message: `Mute timing **${ctx.input.name}** updated.`
    };
  })
  .build();

export let deleteMuteTiming = SlateTool.create(spec, {
  name: 'Delete Mute Timing',
  key: 'delete_mute_timing',
  description: `Delete a mute timing by name. Notification policies referencing it should be updated first.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the mute timing to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteMuteTiming(ctx.input.name);

    return {
      output: {
        message: `Mute timing ${ctx.input.name} deleted.`
      },
      message: `Mute timing **${ctx.input.name}** has been deleted.`
    };
  })
  .build();
