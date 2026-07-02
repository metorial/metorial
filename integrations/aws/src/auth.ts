import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { createSlatesAwsSdkHttpHandler } from '@slates/aws-sdk-http-handler';
import { SlateAuth } from 'slates';
import { z } from 'zod';

let getIdentityProfile = async (output: {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}) => {
  try {
    let client = new STSClient({
      region: 'us-east-1',
      credentials: output,
      requestHandler: createSlatesAwsSdkHttpHandler()
    });
    let identity = await client.send(new GetCallerIdentityCommand({}));

    return {
      profile: {
        id: identity.UserId ?? output.accessKeyId,
        name: identity.Arn ?? output.accessKeyId,
        accountId: identity.Account
      }
    };
  } catch {
    return {
      profile: {
        id: output.accessKeyId,
        name: output.accessKeyId
      }
    };
  }
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      accessKeyId: z.string().describe('AWS Access Key ID'),
      secretAccessKey: z.string().describe('AWS Secret Access Key'),
      sessionToken: z
        .string()
        .optional()
        .describe('AWS Session Token (for temporary credentials)')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'AWS Access Keys',
    key: 'aws_access_keys',

    inputSchema: z.object({
      accessKeyId: z.string().describe('AWS Access Key ID (e.g. AKIAIOSFODNN7EXAMPLE)'),
      secretAccessKey: z.string().describe('AWS Secret Access Key')
    }),

    getOutput: async ctx => {
      return {
        output: {
          accessKeyId: ctx.input.accessKeyId,
          secretAccessKey: ctx.input.secretAccessKey
        }
      };
    },

    getProfile: async (ctx: any) => getIdentityProfile(ctx.output)
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
    },

    getProfile: async (ctx: any) => getIdentityProfile(ctx.output)
  });
