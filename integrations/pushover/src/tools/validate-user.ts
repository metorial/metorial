import { SlateTool } from 'slates';
import { z } from 'zod';
import { PushoverClient } from '../lib/client';
import { spec } from '../spec';

export let validateUser = SlateTool.create(spec, {
  name: 'Validate User',
  key: 'validate_user',
  description: `Validate that a Pushover user key or group key is valid, the account is active, and has at least one active device. Returns the user's active devices and licensed platforms. Optionally validate a specific device name.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userKey: z
        .string()
        .optional()
        .describe(
          'User key or group key to validate. Defaults to the authenticated user key.'
        ),
      device: z.string().optional().describe('Optionally validate a specific device name')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the user/group key is valid and active'),
      isGroup: z.boolean().describe('Whether the key is a group key'),
      devices: z.array(z.string()).describe('List of active device names'),
      licenses: z
        .array(z.string())
        .describe('List of licensed platforms (e.g. Android, iOS, Desktop)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PushoverClient({
      token: ctx.auth.token,
      userKey: ctx.auth.userKey
    });

    let result = await client.validateUser({
      userKey: ctx.input.userKey,
      device: ctx.input.device
    });

    return {
      output: {
        valid: result.status === 1,
        isGroup: result.group === 1,
        devices: result.devices ?? [],
        licenses: result.licenses ?? []
      },
      message:
        result.status === 1
          ? `User key is **valid** with ${result.devices?.length ?? 0} device(s): ${(result.devices ?? []).join(', ')}.`
          : 'User or group key is invalid, the account is inactive, or the requested device is unavailable.'
    };
  })
  .build();
