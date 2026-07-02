import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let outputSchema = z.object({
  apiKey: z.string(),
  apiSecret: z.string(),
  applicationId: z.string().optional(),
  privateKey: z.string().optional()
});

type AuthOutput = z.infer<typeof outputSchema>;

let fetchProfile = async (output: AuthOutput) => {
  let restAxios = createAxios({ baseURL: 'https://rest.nexmo.com' });
  let res = await restAxios.get('/account/get-balance', {
    params: {
      api_key: output.apiKey,
      api_secret: output.apiSecret
    }
  });
  return {
    profile: {
      id: output.apiKey,
      name: `Vonage Account (${output.apiKey})`,
      balance: res.data.value
    }
  };
};

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Secret',
    key: 'api_key_secret',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Vonage API Key (found at the top of the Vonage Dashboard)'),
      apiSecret: z
        .string()
        .describe('Your Vonage API Secret (found at the top of the Vonage Dashboard)')
    }),

    getOutput: async (ctx: { input: { apiKey: string; apiSecret: string } }) => {
      return {
        output: {
          apiKey: ctx.input.apiKey,
          apiSecret: ctx.input.apiSecret
        }
      };
    },

    getProfile: async (ctx: {
      output: AuthOutput;
      input: { apiKey: string; apiSecret: string };
    }) => {
      return fetchProfile(ctx.output);
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key, Secret & Application JWT',
    key: 'api_key_jwt',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Vonage API Key (found at the top of the Vonage Dashboard)'),
      apiSecret: z
        .string()
        .describe('Your Vonage API Secret (found at the top of the Vonage Dashboard)'),
      applicationId: z
        .string()
        .describe('The Vonage Application ID (from the Applications page in the Dashboard)'),
      privateKey: z
        .string()
        .describe(
          'The private key contents (from the private.key file downloaded when generating keys for your Vonage Application)'
        )
    }),

    getOutput: async (ctx: {
      input: { apiKey: string; apiSecret: string; applicationId: string; privateKey: string };
    }) => {
      return {
        output: {
          apiKey: ctx.input.apiKey,
          apiSecret: ctx.input.apiSecret,
          applicationId: ctx.input.applicationId,
          privateKey: ctx.input.privateKey
        }
      };
    },

    getProfile: async (ctx: {
      output: AuthOutput;
      input: { apiKey: string; apiSecret: string; applicationId: string; privateKey: string };
    }) => {
      return fetchProfile(ctx.output);
    }
  });
