import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      accessKeyId: z.string().describe('AWS Access Key ID'),
      secretAccessKey: z.string().describe('AWS Secret Access Key'),
      sessionToken: z
        .string()
        .optional()
        .describe('AWS Session Token for temporary credentials')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'AWS IAM Credentials',
    key: 'aws_iam_credentials',

    inputSchema: z.object({
      accessKeyId: z.string().describe('AWS Access Key ID'),
      secretAccessKey: z.string().describe('AWS Secret Access Key'),
      sessionToken: z
        .string()
        .optional()
        .describe('AWS Session Token (required for temporary credentials from STS AssumeRole)')
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
