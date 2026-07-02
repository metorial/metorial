import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listMachineProcesses = SlateTool.create(spec, {
  name: 'List Machine Processes',
  key: 'list_machine_processes',
  description:
    'List processes currently running on a Fly Machine, including CPU, memory, and listening socket details.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      machineId: z.string().describe('ID of the Fly Machine'),
      sortBy: z.string().optional().describe('Field to sort by'),
      order: z.string().optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      processes: z
        .array(
          z.object({
            pid: z.number().describe('Process ID'),
            command: z.string().describe('Command'),
            directory: z.string().describe('Working directory'),
            cpu: z.number().describe('CPU usage'),
            rss: z.number().describe('Resident memory size'),
            rtime: z.number().describe('Runtime'),
            stime: z.number().describe('System time'),
            listenSockets: z
              .array(
                z.object({
                  address: z.string().describe('Listening address'),
                  proto: z.string().describe('Protocol')
                })
              )
              .describe('Listening sockets')
          })
        )
        .describe('Machine processes')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let processes = await client.listMachineProcesses(ctx.input.appName, ctx.input.machineId, {
      sortBy: ctx.input.sortBy,
      order: ctx.input.order
    });

    return {
      output: { processes },
      message: `Found **${processes.length}** process(es) on machine **${ctx.input.machineId}**.`
    };
  })
  .build();
