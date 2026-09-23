import { createGoogleOAuth, googleOAuthOutputSchema } from '@slates/oauth-google';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { superGoogle2AScopes } from './scopes';

export let superGoogle2AAuthOutputSchema = googleOAuthOutputSchema.extend({
  scopes: z.array(z.string()).optional()
});

export type SuperGoogle2AAuth = z.infer<typeof superGoogle2AAuthOutputSchema>;

let googleOAuth = createGoogleOAuth({
  name: 'G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ OAuth',
  key: 'google_oauth',
  scopes: superGoogle2AScopes
});

export let auth = SlateAuth.create()
  .output(superGoogle2AAuthOutputSchema)
  .addOauth({
    ...googleOAuth,
    handleCallback: async ctx => {
      let result = await googleOAuth.handleCallback(ctx);
      return {
        ...result,
        output: { ...result.output, scopes: result.scopes }
      };
    },
    handleTokenRefresh: async (
      ctx: Parameters<typeof googleOAuth.handleTokenRefresh>[0] & {
        output: SuperGoogle2AAuth;
      }
    ) => {
      let result = await googleOAuth.handleTokenRefresh(ctx);
      return {
        ...result,
        output: { ...result.output, scopes: ctx.output.scopes ?? ctx.scopes }
      };
    }
  });
