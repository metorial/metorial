import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scheduledDeploymentSchema = z.object({
  scheduledDeploymentIdentifier: z.string().describe('Scheduled deployment identifier'),
  frequency: z.string().describe('Recurrence pattern (daily, weekly, monthly)'),
  scheduleHour: z.number().optional().describe('Scheduled hour'),
  scheduleMinute: z.number().optional().describe('Scheduled minute'),
  nextDeploymentAt: z.string().optional().describe('Next scheduled deployment timestamp'),
  startRevision: z.string().optional().describe('Start revision'),
  endRevision: z.string().optional().describe('End revision'),
  copyConfigFiles: z.boolean().optional().describe('Whether config files are copied'),
  runBuildCommands: z.boolean().optional().describe('Whether build commands run'),
  server: z
    .object({
      serverIdentifier: z.string().optional().describe('Server identifier'),
      name: z.string().optional().describe('Server name'),
      protocolType: z.string().optional().describe('Protocol type')
    })
    .optional()
    .describe('Target server')
});

export let listScheduledDeployments = SlateTool.create(spec, {
  name: 'List Scheduled Deployments',
  key: 'list_scheduled_deployments',
  description: `List all scheduled deployments for a DeployHQ project. Shows recurring deployment schedules with their frequency, timing, and target servers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project')
    })
  )
  .output(
    z.object({
      scheduledDeployments: z
        .array(scheduledDeploymentSchema)
        .describe('List of scheduled deployments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let scheduled = await client.listScheduledDeployments(ctx.input.projectPermalink);

    let mapped = (Array.isArray(scheduled) ? scheduled : []).map((s: any) => ({
      scheduledDeploymentIdentifier: s.identifier,
      frequency: s.frequency,
      scheduleHour: s.at?.hour,
      scheduleMinute: s.at?.minute,
      nextDeploymentAt: s.next_deployment_at,
      startRevision: s.start_revision,
      endRevision: s.end_revision,
      copyConfigFiles: s.copy_config_files,
      runBuildCommands: s.run_build_commands,
      server: s.server
        ? {
            serverIdentifier: s.server.identifier,
            name: s.server.name,
            protocolType: s.server.protocol_type
          }
        : undefined
    }));

    return {
      output: { scheduledDeployments: mapped },
      message: `Found **${mapped.length}** scheduled deployment(s) in project \`${ctx.input.projectPermalink}\`.`
    };
  })
  .build();
