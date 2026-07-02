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
    name: 'IAM Credentials',
    key: 'iam_credentials',

    inputSchema: z.object({
      accessKeyId: z.string().describe('AWS Access Key ID'),
      secretAccessKey: z.string().describe('AWS Secret Access Key'),
      sessionToken: z
        .string()
        .optional()
        .describe('AWS Session Token (required for temporary credentials from STS)')
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
