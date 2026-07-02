import {
  GOOGLE_PEOPLE_API_BASE_URL,
  GooglePeopleClient,
  searchContactsRecipe
} from '@slates/google-people-recipes';
import { includeTool } from '@slates/tool-recipes';
import { createAxios, SlateTool } from 'slates';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

let peopleAxios = createAxios({
  baseURL: GOOGLE_PEOPLE_API_BASE_URL
});

export let searchGoogleContacts = includeTool({
  recipe: searchContactsRecipe,
  spec,
  dependencies: {
    createClient: (ctx: { auth: { token: string } }) =>
      new GooglePeopleClient({ token: ctx.auth.token, api: peopleAxios })
  },
  toolFactory: SlateTool,
  key: 'search_google_contacts',
  name: 'Search Google Contacts',
  description:
    "Searches the authenticated user's Google Contacts from the People API by name, email address, phone number, or other fields.",
  scopes: gmailActionScopes.searchGoogleContacts
});
