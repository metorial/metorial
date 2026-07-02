import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      accessKeyId: z.string(),
      secretAccessKey: z.string(),
      sessionToken: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'AWS IAM Access Keys',
    key: 'aws_iam_credentials',

    inputSchema: z.object({
      accessKeyId: z.string().describe('AWS Access Key ID'),
      secretAccessKey: z.string().describe('AWS Secret Access Key')
    }),

    getOutput: async ctx => {
      return {
        output: {
          accessKeyId: ctx.input.accessKeyId,
          secretAccessKey: ctx.input.secretAccessKey
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'AWS Temporary Credentials (STS)',
    key: 'aws_temporary_credentials',

    inputSchema: z.object({
      accessKeyId: z.string().describe('Temporary AWS Access Key ID'),
      secretAccessKey: z.string().describe('Temporary AWS Secret Access Key'),
      sessionToken: z.string().describe('AWS Session Token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          accessKeyId: ctx.input.accessKeyId,
          secretAccessKey: ctx.input.secretAccessKey,
          sessionToken: ctx.input.sessionToken
        }
      };
    }
  });
