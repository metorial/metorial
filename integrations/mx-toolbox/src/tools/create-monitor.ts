import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMonitor = SlateTool.create(spec, {
  name: 'Create Monitor',
  key: 'create_monitor',
  description: `Create a new monitor to track the health of a domain, IP, or server. Monitors can watch for blacklist status, SMTP availability, DNS records, MX records, and more. Once created, the monitor will continuously check the target and alert on status changes.`,
  instructions: [
    'The command specifies the type of monitoring (e.g., "blacklist", "smtp", "mx", "dns", "a").',
    'The argument is the domain name or IP address to monitor.'
  ],
  constraints: ['Monitor creation is limited by your subscription plan.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      command: z
        .string()
        .describe(
          'The type of monitor to create (e.g., "blacklist", "smtp", "mx", "dns", "a", "spf", "dmarc")'
        ),
      argument: z.string().describe('The domain name or IP address to monitor')
    })
  )
  .output(
    z.object({
      monitorUid: z.string().describe('Unique identifier of the newly created monitor'),
      actionString: z.string().describe('Monitor type and target'),
      lastTransition: z.string().describe('Timestamp of the last status change'),
      lastChecked: z.string().describe('Timestamp of the most recent check'),
      mxRep: z.string().describe('MX reputation score'),
      failing: z.array(z.string()).describe('List of currently failing checks'),
      warnings: z.array(z.string()).describe('List of current warnings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let monitor = await client.createMonitor(ctx.input.command, ctx.input.argument);

    return {
      output: monitor,
      message: `Created **${ctx.input.command}** monitor for **${ctx.input.argument}** (UID: ${monitor.monitorUid}).`
    };
  })
  .build();
