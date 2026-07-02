import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Keen.io API key (Master, Write, Read, or Access Key)'),
      keyType: z
        .enum(['master', 'write', 'read', 'access'])
        .describe('The type of API key being used')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Master Key',
    key: 'master_key',
    inputSchema: z.object({
      masterKey: z
        .string()
        .describe(
          'The Master Key for your Keen.io project. Found on the Access tab. Grants full access to all APIs including administrative functions.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.masterKey,
          keyType: 'master' as const
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Read Key',
    key: 'read_key',
    inputSchema: z.object({
      readKey: z
        .string()
        .describe(
          'The Read Key for your Keen.io project. Found on the Access tab. Grants access to query and extract data.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.readKey,
          keyType: 'read' as const
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Write Key',
    key: 'write_key',
    inputSchema: z.object({
      writeKey: z
        .string()
        .describe(
          'The Write Key for your Keen.io project. Found on the Access tab. Grants access to write event data.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.writeKey,
          keyType: 'write' as const
        }
      };
    }
  });
