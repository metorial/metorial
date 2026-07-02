import {
  GOOGLE_PEOPLE_API_BASE_URL,
  GooglePeopleClient,
  listContactsRecipe
} from '@slates/google-people-recipes';
import { includeTool } from '@slates/tool-recipes';
import { createAxios, SlateTool } from 'slates';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

let peopleAxios = createAxios({
  baseURL: GOOGLE_PEOPLE_API_BASE_URL
});

export let listGoogleContacts = includeTool({
  recipe: listContactsRecipe,
  spec,
  dependencies: {
    createClient: (ctx: { auth: { token: string } }) =>
      new GooglePeopleClient({ token: ctx.auth.token, api: peopleAxios })
  },
  toolFactory: SlateTool,
  key: 'list_google_contacts',
  name: 'List Google Contacts',
  description:
    "Lists the authenticated user's Google Contacts from the People API with pagination support. Use the `pageToken` from a previous response to fetch the next page.",
  scopes: gmailActionScopes.listGoogleContacts
});
