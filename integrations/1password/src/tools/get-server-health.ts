import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let getServerHealth = SlateTool.create(spec, {
  name: 'Get Server Health',
  key: 'get_server_health',
  description: `Check the health and status of the 1Password Connect server, including its version and the status of dependent services. Useful for verifying connectivity and diagnosing issues.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string().describe('Server name'),
      version: z.string().describe('Server version'),
      dependencies: z
        .array(
          z.object({
            service: z.string().describe('Name of the dependent service'),
            status: z.string().describe('Status of the dependency (e.g., ACTIVE, INACTIVE)'),
            message: z.string().optional().describe('Additional status message')
          })
        )
        .describe('Status of server dependencies')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.connectServerUrl) {
      throw new Error('Connect server URL is required. Set it in the configuration.');
    }

    let client = new ConnectClient({
      token: ctx.auth.token,
      serverUrl: ctx.config.connectServerUrl
    });

    ctx.progress('Checking server health...');
    let health = await client.getServerHealth();

    let allHealthy = health.dependencies.every(d => d.status === 'ACTIVE');

    return {
      output: health,
      message: `Connect server **${health.name}** v${health.version} is ${allHealthy ? '**healthy**' : '**degraded**'}.\n${health.dependencies.map(d => `- ${d.service}: ${d.status}${d.message ? ` (${d.message})` : ''}`).join('\n')}`
    };
  })
  .build();
