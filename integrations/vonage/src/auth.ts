import { createPublicKey } from 'node:crypto';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { VonageRestClient, validateAuth } from './lib/client';
import { generateVonageJwt, rsaPrivateKey, rsaPublicKey } from './lib/jwt';
import { incomplete, record } from './lib/validation';

const outputSchema = z.object({
  apiKey: z.string(),
  apiSecret: z.string(),
  applicationId: z.string().optional(),
  privateKey: z.string().optional()
});
type AuthOutput = z.infer<typeof outputSchema>;
async function fetchProfile(output: AuthOutput) {
  const checked = validateAuth(output),
    client = new VonageRestClient(checked),
    balance = await client.getBalance();
  if (checked.applicationId && checked.privateKey) {
    const app = await client.getApplication(checked.applicationId);
    const expected = createPublicKey(rsaPrivateKey(checked.privateKey))
      .export({ type: 'spki', format: 'pem' })
      .toString();
    if (rsaPublicKey(String(record(app.keys).public_key)) !== expected) throw incomplete();
  }
  return {
    profile: {
      id: checked.apiKey,
      name: 'Vonage account',
      balance: balance.value,
      configuredAccountApiKey: checked.apiKey,
      applicationId: checked.applicationId
    }
  };
}
const keySchema = z.object({
  apiKey: z.string().describe('Eight-character account API key from the Vonage Dashboard'),
  apiSecret: z.string().describe('Vonage account API secret')
});
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Secret',
    key: 'api_key_secret',
    inputSchema: keySchema,
    getOutput: async (ctx: { input: { apiKey: string; apiSecret: string } }) => ({
      output: validateAuth(ctx.input)
    }),
    getProfile: async (ctx: { output: AuthOutput }) => fetchProfile(ctx.output)
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key, Secret & Application JWT',
    key: 'api_key_jwt',
    inputSchema: keySchema.extend({
      applicationId: z
        .string()
        .describe('Exact application ID from manage_applications list/get or the Dashboard'),
      privateKey: z
        .string()
        .describe('Matching unencrypted RSA private key contents, PKCS#1 or PKCS#8 PEM')
    }),
    getOutput: async (ctx: {
      input: { apiKey: string; apiSecret: string; applicationId: string; privateKey: string };
    }) => {
      const output = validateAuth(ctx.input);
      await generateVonageJwt(ctx.input.applicationId, ctx.input.privateKey);
      return { output };
    },
    getProfile: async (ctx: { output: AuthOutput }) => fetchProfile(ctx.output)
  });
