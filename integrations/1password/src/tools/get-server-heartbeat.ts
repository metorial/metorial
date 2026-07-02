import { SlateTool } from 'slates';
import { z } from 'zod';
import { createConnectClient } from '../lib/connect-tool';
import { spec } from '../spec';

export let getServerHeartbeat = SlateTool.create(spec, {
  name: 'Get Server Heartbeat',
  key: 'get_server_heartbeat',
  description: `Ping the 1Password Connect server heartbeat endpoint to verify that the server process is reachable.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      ok: z.boolean().describe('Whether the heartbeat endpoint returned a 2xx response'),
      status: z.number().describe('HTTP status returned by the heartbeat endpoint')
    })
  )
  .handleInvocation(async ctx => {
    let client = createConnectClient(ctx);

    ctx.progress('Checking server heartbeat...');
    let heartbeat = await client.getServerHeartbeat();

    return {
      output: heartbeat,
      message: `Connect server heartbeat returned HTTP ${heartbeat.status}.`
    };
  })
  .build();
