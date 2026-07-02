import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLogSession = SlateTool.create(spec, {
  name: 'Create Log Session',
  key: 'create_log_session',
  description: `Create a temporary Heroku Logplex session URL for streaming recent or live app logs. Use this to inspect runtime output without configuring a persistent log drain.`,
  tags: {
    readOnly: true
  },
  instructions: [
    'Set tail to false for a finite recent-log URL.',
    'Set source to "app" for application logs or "heroku" for platform logs.',
    'Use type or dynoName to narrow logs to a process type or dyno.'
  ]
})
  .input(
    z.object({
      appIdOrName: z.string().describe('App name or unique identifier'),
      dynoName: z.string().optional().describe('Dyno name to limit results to'),
      lines: z.number().optional().describe('Number of log lines to stream at once'),
      source: z.string().optional().describe('Log source to limit results to'),
      tail: z.boolean().optional().describe('Whether to stream ongoing logs'),
      type: z.string().optional().describe('Process type to limit results to')
    })
  )
  .output(
    z.object({
      logSessionId: z.string().describe('Unique identifier of the log session'),
      logplexUrl: z.string().describe('URL for the log streaming session'),
      createdAt: z.string().describe('When the log session was created'),
      updatedAt: z.string().describe('When the log session was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let logSession = await client.createLogSession(ctx.input.appIdOrName, {
      dynoName: ctx.input.dynoName,
      lines: ctx.input.lines,
      source: ctx.input.source,
      tail: ctx.input.tail,
      type: ctx.input.type
    });

    return {
      output: logSession,
      message: `Created log session **${logSession.logSessionId}** for app **${ctx.input.appIdOrName}**.`
    };
  })
  .build();
