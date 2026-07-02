import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageNetworkSecretKey = SlateTool.create(spec, {
  name: 'Manage Network Secret Key',
  key: 'manage_network_secret_key',
  description: `Generate, rotate, or revoke a network's secret key used for agent authentication.
- **generate**: Creates a new secret key for the network.
- **rotate**: Replaces the existing secret key with a new one.
- **revoke**: Removes the secret key entirely.`
})
  .input(
    z.object({
      networkId: z.string().describe('Network ID'),
      action: z
        .enum(['generate', 'rotate', 'revoke'])
        .describe('Secret key operation to perform')
    })
  )
  .output(
    z.object({
      secretKey: z
        .record(z.string(), z.any())
        .optional()
        .describe('Secret key details (for generate/rotate)'),
      revoked: z.boolean().optional().describe('Whether the key was revoked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { networkId, action } = ctx.input;

    if (action === 'generate') {
      let secretKey = await client.generateNetworkSecretKey(networkId);
      return {
        output: { secretKey },
        message: `Generated secret key for network **${networkId}**.`
      };
    }

    if (action === 'rotate') {
      let secretKey = await client.rotateNetworkSecretKey(networkId);
      return {
        output: { secretKey },
        message: `Rotated secret key for network **${networkId}**.`
      };
    }

    await client.revokeNetworkSecretKey(networkId);
    return {
      output: { revoked: true },
      message: `Revoked secret key for network **${networkId}**.`
    };
  })
  .build();
