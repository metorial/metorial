import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let getMachines = SlateTool.create(spec, {
  name: 'Get Machines',
  key: 'get_machines',
  description: `List all machines (computers) that have sent coding activity, including hostname, IP, and last seen time.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      machines: z
        .array(
          z
            .object({
              machineId: z.string().describe('Unique machine ID'),
              name: z.string().describe('Machine name/hostname'),
              ip: z.string().optional().describe('Machine IP address'),
              lastSeenAt: z.string().optional().describe('When the machine was last active'),
              createdAt: z.string().optional().describe('When the machine was first seen')
            })
            .passthrough()
        )
        .describe('List of machines'),
      totalMachines: z.number().describe('Total number of machines')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let machines = await client.getMachines();

    let mapped = (machines || []).map((m: any) => ({
      machineId: m.id ?? '',
      name: m.value ?? m.name ?? '',
      ip: m.ip,
      lastSeenAt: m.last_seen_at,
      createdAt: m.created_at
    }));

    return {
      output: {
        machines: mapped,
        totalMachines: mapped.length
      },
      message: `Found **${mapped.length}** machine(s).`
    };
  })
  .build();
