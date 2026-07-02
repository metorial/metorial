import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { herokuServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageDynos = SlateTool.create(spec, {
  name: 'Manage Dynos',
  key: 'manage_dynos',
  description: `List running dynos, run one-off dynos, or restart dynos for a Heroku app. Use **action** to specify the operation:
- \`list\`: List all running dynos.
- \`run\`: Run a one-off dyno with a command (e.g., \`bash\`, \`rails console\`).
- \`restart\`: Restart a specific dyno or all dynos.`,
  instructions: [
    'To restart all dynos, use action "restart" without specifying a dynoIdOrName.'
  ]
})
  .input(
    z.object({
      appIdOrName: z.string().describe('App name or unique identifier'),
      action: z.enum(['list', 'run', 'restart']).describe('Operation to perform'),
      command: z
        .string()
        .optional()
        .describe('Command to execute (required for "run" action)'),
      dynoIdOrName: z
        .string()
        .optional()
        .describe('Specific dyno name or ID (for "restart" action, omit to restart all)'),
      size: z
        .string()
        .optional()
        .describe(
          'Dyno size for "run" action (e.g., "standard-1X", "standard-2X", "performance-m")'
        ),
      env: z
        .record(z.string(), z.string())
        .optional()
        .describe('Environment variables for "run" action'),
      timeToLive: z
        .number()
        .optional()
        .describe('Seconds until the one-off dyno expires (for "run" action)')
    })
  )
  .output(
    z.object({
      dynos: z
        .array(
          z.object({
            dynoId: z.string().describe('Unique identifier of the dyno'),
            command: z.string().describe('Command the dyno is running'),
            name: z.string().describe('Name of the dyno'),
            size: z.string().describe('Size of the dyno'),
            state: z.string().describe('Current state of the dyno'),
            type: z.string().describe('Process type'),
            createdAt: z.string().describe('When the dyno was created'),
            attachUrl: z.string().nullable().describe('URL to attach to the dyno session')
          })
        )
        .optional()
        .describe('List of dynos (for "list" and "run" actions)'),
      restarted: z.boolean().optional().describe('Whether dynos were successfully restarted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { appIdOrName, action } = ctx.input;

    if (action === 'list') {
      let dynos = await client.listDynos(appIdOrName);
      return {
        output: {
          dynos: dynos.map(d => ({
            dynoId: d.dynoId,
            command: d.command,
            name: d.name,
            size: d.size,
            state: d.state,
            type: d.type,
            createdAt: d.createdAt,
            attachUrl: d.attachUrl
          }))
        },
        message: `Found **${dynos.length}** dyno(s) for app **${appIdOrName}**.`
      };
    }

    if (action === 'run') {
      if (!ctx.input.command) {
        throw herokuServiceError('Command is required for "run" action.');
      }
      let dyno = await client.runDyno(appIdOrName, {
        command: ctx.input.command,
        size: ctx.input.size,
        env: ctx.input.env,
        timeToLive: ctx.input.timeToLive
      });
      return {
        output: {
          dynos: [
            {
              dynoId: dyno.dynoId,
              command: dyno.command,
              name: dyno.name,
              size: dyno.size,
              state: dyno.state,
              type: dyno.type,
              createdAt: dyno.createdAt,
              attachUrl: dyno.attachUrl
            }
          ]
        },
        message: `Started one-off dyno **${dyno.name}** running \`${dyno.command}\`.`
      };
    }

    // restart
    if (ctx.input.dynoIdOrName) {
      await client.restartDyno(appIdOrName, ctx.input.dynoIdOrName);
      return {
        output: { restarted: true },
        message: `Restarted dyno **${ctx.input.dynoIdOrName}** on app **${appIdOrName}**.`
      };
    } else {
      await client.restartAllDynos(appIdOrName);
      return {
        output: { restarted: true },
        message: `Restarted all dynos on app **${appIdOrName}**.`
      };
    }
  })
  .build();
