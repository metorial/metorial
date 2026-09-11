import { createGoogleOAuth, googleOAuthOutputSchema } from '@slates/oauth-google';
import { SlateAuth } from 'slates';
import { superGoogle3OAuthScopes } from './scopes';

export let auth = SlateAuth.create()
  .output(googleOAuthOutputSchema)
  .addOauth(
    createGoogleOAuth({
      key: 'google_oauth',
      name: 'G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ OAuth',
      scopes: superGoogle3OAuthScopes
    })
  );
