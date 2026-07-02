import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSession = SlateTool.create(spec, {
  name: 'Get Session',
  key: 'get_session',
  description: `Retrieve detailed information about a specific browser session, including connection URLs, status, timing, proxy usage, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID to retrieve')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session identifier'),
      status: z.string().describe('Session status (RUNNING, COMPLETED, ERROR, TIMED_OUT)'),
      region: z.string().describe('Session region'),
      createdAt: z.string().describe('Creation timestamp'),
      startedAt: z.string().describe('Start timestamp'),
      endedAt: z.string().nullable().describe('End timestamp if completed'),
      expiresAt: z.string().describe('Expiration timestamp'),
      keepAlive: z.boolean().describe('Whether keep-alive is enabled'),
      proxyBytes: z.number().describe('Bytes consumed via proxy'),
      contextId: z.string().nullable().describe('Linked context ID'),
      userMetadata: z.record(z.string(), z.string()).nullable().describe('Custom metadata'),
      connectUrl: z.string().optional().describe('WebSocket connection URL'),
      seleniumRemoteUrl: z.string().optional().describe('Selenium remote URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let session = await client.getSession(ctx.input.sessionId);

    return {
      output: {
        sessionId: session.sessionId,
        status: session.status,
        region: session.region,
        createdAt: session.createdAt,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        expiresAt: session.expiresAt,
        keepAlive: session.keepAlive,
        proxyBytes: session.proxyBytes,
        contextId: session.contextId,
        userMetadata: session.userMetadata,
        connectUrl: session.connectUrl,
        seleniumRemoteUrl: session.seleniumRemoteUrl
      },
      message: `Session **${session.sessionId}** is **${session.status}** in region **${session.region}**.`
    };
  })
  .build();
