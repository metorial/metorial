import { createGoogleOAuth, googleOAuthOutputSchema } from '@slates/oauth-google';
import { SlateAuth } from 'slates';
import type { z } from 'zod';
import { superGoogle2AScopes } from './scopes';

export let superGoogle2AAuthOutputSchema = googleOAuthOutputSchema;

export type SuperGoogle2AAuth = z.infer<typeof superGoogle2AAuthOutputSchema>;

export let auth = SlateAuth.create()
  .output(superGoogle2AAuthOutputSchema)
  .addOauth(
    createGoogleOAuth({
      name: 'G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ OAuth',
      key: 'google_oauth',
      scopes: superGoogle2AScopes
    })
  );
