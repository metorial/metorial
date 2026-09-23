import {
  createGoogleIdentityClient,
  getCurrentUserRecipe,
  googleIdentityActionScopes
} from '@slates/google-identity-recipes';
import { includeTool } from '@slates/tool-recipes';
import { SlateTool } from 'slates';
import { spec } from '../spec';

export let getCurrentUser = includeTool({
  recipe: getCurrentUserRecipe,
  spec,
  dependencies: { createClient: createGoogleIdentityClient },
  scopes: googleIdentityActionScopes,
  toolFactory: {
    create: (_spec: typeof spec, parameters: Parameters<typeof SlateTool.create>[1]) =>
      SlateTool.create(spec, parameters).authMethods(['google_oauth'])
  }
});
