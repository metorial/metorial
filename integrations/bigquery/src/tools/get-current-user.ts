import {
  createGoogleIdentityClient,
  getCurrentUserRecipe
} from '@slates/google-identity-recipes';
import { includeTool } from '@slates/tool-recipes';
import { type SlateActionParameters, SlateTool } from 'slates';
import { spec } from '../spec';

export const getCurrentUser = includeTool({
  spec,
  recipe: getCurrentUserRecipe,
  toolFactory: {
    create: (_spec: typeof spec, parameters: SlateActionParameters) =>
      SlateTool.create(spec, parameters).authMethods(['google_oauth'])
  },
  dependencies: { createClient: createGoogleIdentityClient }
});
