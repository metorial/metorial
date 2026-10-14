import { SlateAuth } from 'slates';
import { z } from 'zod';

let projectIdSchema = z
  .string()
  .describe('Project ID paired with this API key, shown on the project Access tab.');

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Keen.io API key (Master, Write, Read, or Access Key)'),
      projectId: projectIdSchema.optional(),
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
      projectId: projectIdSchema,
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
          projectId: ctx.input.projectId,
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
      projectId: projectIdSchema,
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
          projectId: ctx.input.projectId,
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
      projectId: projectIdSchema,
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
          projectId: ctx.input.projectId,
          keyType: 'write' as const
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Key',
    key: 'access_key',
    inputSchema: z.object({
      projectId: projectIdSchema,
      accessKey: z
        .string()
        .describe('A custom API key with permission for the required operations.')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.accessKey,
        projectId: ctx.input.projectId,
        keyType: 'access' as const
      }
    })
  });
