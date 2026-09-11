import { createGoogleOAuth, googleOAuthOutputSchema } from '@slates/oauth-google';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { superGoogle2AScopes } from './scopes';

export let superGoogle2AOAuthInputSchema = z.object({
  developerToken: z
    .string()
    .min(1)
    .describe('Google Ads API developer token from the API Center of a manager account.')
});

export let superGoogle2AAuthOutputSchema = googleOAuthOutputSchema.extend({
  developerToken: z.string().min(1)
});

export type SuperGoogle2AAuth = z.infer<typeof superGoogle2AAuthOutputSchema>;

export let auth = SlateAuth.create()
  .output(superGoogle2AAuthOutputSchema)
  .addOauth(
    createGoogleOAuth({
      name: 'G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ OAuth',
      key: 'google_oauth',
      scopes: superGoogle2AScopes,
      additionalInput: {
        schema: superGoogle2AOAuthInputSchema,
        mapToOutput: input => ({ developerToken: input.developerToken })
      }
    })
  );
