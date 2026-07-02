import {
  GOOGLE_PEOPLE_API_BASE_URL,
  GooglePeopleClient,
  searchContactsRecipe
} from '@slates/google-people-recipes';
import { includeTool } from '@slates/tool-recipes';
import { createAxios, SlateTool } from 'slates';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

let peopleAxios = createAxios({
  baseURL: GOOGLE_PEOPLE_API_BASE_URL
});

export let searchContacts = includeTool({
  recipe: searchContactsRecipe,
  spec,
  dependencies: {
    createClient: (ctx: { auth: { token: string } }) =>
      new GooglePeopleClient({ token: ctx.auth.token, api: peopleAxios })
  },
  toolFactory: SlateTool,
  scopes: googleContactsActionScopes.searchContacts
});
