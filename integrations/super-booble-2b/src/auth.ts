import { createGoogleOAuth, googleOAuthOutputSchema } from '@slates/oauth-google';
import { SlateAuth } from 'slates';
import type { z } from 'zod';
import { superGoogle2BScopes } from './scopes';

export let superGoogle2BAuthOutputSchema = googleOAuthOutputSchema;

export type SuperGoogle2BAuth = z.infer<typeof superGoogle2BAuthOutputSchema>;

export let auth = SlateAuth.create()
  .output(superGoogle2BAuthOutputSchema)
  .addOauth(
    createGoogleOAuth({
      name: 'G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ OAuth',
      key: 'google_oauth',
      scopes: superGoogle2BScopes
    })
  );
