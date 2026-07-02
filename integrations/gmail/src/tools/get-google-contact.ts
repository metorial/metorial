import {
  GOOGLE_PEOPLE_API_BASE_URL,
  GooglePeopleClient,
  getContactRecipe
} from '@slates/google-people-recipes';
import { includeTool } from '@slates/tool-recipes';
import { createAxios, SlateTool } from 'slates';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

let peopleAxios = createAxios({
  baseURL: GOOGLE_PEOPLE_API_BASE_URL
});

export let getGoogleContact = includeTool({
  recipe: getContactRecipe,
  spec,
  dependencies: {
    createClient: (ctx: { auth: { token: string } }) =>
      new GooglePeopleClient({ token: ctx.auth.token, api: peopleAxios })
  },
  toolFactory: SlateTool,
  key: 'get_google_contact',
  name: 'Get Google Contact',
  description:
    'Retrieves detailed Google Contacts information for a People API resource name. Use `people/me` to get the authenticated user profile.',
  scopes: gmailActionScopes.getGoogleContact
});
