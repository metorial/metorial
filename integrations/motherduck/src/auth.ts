import { SlateAuth } from 'slates';
import { z } from 'zod';
import {
  createMotherDuckClient,
  MOTHERDUCK_REGIONS,
  type MotherDuckRegion
} from './lib/client';

let outputSchema = z.object({
  token: z.string(),
  region: z.enum(MOTHERDUCK_REGIONS)
});

let validateProfile = async (token: string, region: MotherDuckRegion) => ({
  profile: await createMotherDuckClient(token, region).getProfile()
});

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'MotherDuck Access Token',
    key: 'access_token',
    docs: [
      {
        type: 'docs.auth.token',
        name: 'MotherDuck access tokens and PostgreSQL endpoint',
        url: 'https://motherduck.com/blog/motherduck-now-speaks-postgres/'
      }
    ],
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe('MotherDuck access token used as the PostgreSQL endpoint password'),
      region: z
        .enum(MOTHERDUCK_REGIONS)
        .describe('MotherDuck account region shown in the MotherDuck UI')
    }),
    getOutput: async ctx => ({ output: ctx.input }),
    getProfile: async (ctx: any) => validateProfile(ctx.output.token, ctx.output.region)
  });
