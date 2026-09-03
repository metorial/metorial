import { createGoogleOAuth, googleOAuthOutputSchema } from '@slates/oauth-google';
import { SlateAuth } from 'slates';
import { superGoogle1OAuthScopes } from './scopes';

export let auth = SlateAuth.create()
  .output(googleOAuthOutputSchema)
  .addOauth(
    createGoogleOAuth({
      name: 'G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ OAuth',
      key: 'oauth',
      scopes: superGoogle1OAuthScopes
    })
  );
