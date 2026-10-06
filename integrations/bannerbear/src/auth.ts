import { SlateAuth } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from './lib/client';
import { type Connection, nonempty, optionalText, reject } from './lib/contracts';

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      keyType: z.enum(['project', 'full_master', 'limited_master']).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'V2 API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Bannerbear V2 Project or Full Access Master API key. V5 keys are incompatible with V2.'
        ),
      keyType: z
        .enum(['project', 'full_master', 'limited_master'])
        .optional()
        .describe(
          'Defaults to Project. Full Access Master tools require projectId from list_resources. Limited Access Master keys cannot supply the required account profile.'
        )
    }),
    getOutput: async (ctx: { input: { token: string; keyType?: Connection['keyType'] } }) => {
      const output = {
        token: ctx.input.token,
        keyType: ctx.input.keyType ?? ('project' as const)
      };
      new BannerbearClient(output);
      if (output.keyType === 'limited_master')
        reject(
          'Limited Access Master keys do not support the required account profile. Connect a Project or Full Access Master V2 key.'
        );
      return { output };
    },
    getProfile: async (ctx: { output: Connection }) => {
      const account = await new BannerbearClient(ctx.output).getAccount();
      return {
        profile: {
          id: nonempty(account.uid),
          name: optionalText(account.paid_plan_name) || 'Bannerbear account'
        }
      };
    }
  });
