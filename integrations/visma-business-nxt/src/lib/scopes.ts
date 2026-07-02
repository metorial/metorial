import { anyOf } from 'slates';

export let BUSINESS_NXT_READ_SCOPE = 'business-graphql-api:access-group-based-readonly';
export let BUSINESS_NXT_WRITE_SCOPE = 'business-graphql-api:access-group-based';

export let VISMA_IDENTITY_SCOPES = ['openid', 'email', 'profile', 'offline_access'];

export let businessNxtReadAccess = anyOf(BUSINESS_NXT_READ_SCOPE, BUSINESS_NXT_WRITE_SCOPE);

export let businessNxtOAuthScopes = [
  {
    title: 'OpenID',
    description: 'Authenticate the Visma user.',
    scope: 'openid'
  },
  {
    title: 'Email',
    description: 'Read the authenticated Visma user email address.',
    scope: 'email'
  },
  {
    title: 'Profile',
    description: 'Read the authenticated Visma user profile.',
    scope: 'profile'
  },
  {
    title: 'Offline Access',
    description: 'Allow Slates to refresh Visma Connect access tokens.',
    scope: 'offline_access'
  },
  {
    title: 'Business NXT Read',
    description: 'Read Business NXT data available to the authenticated user.',
    scope: BUSINESS_NXT_READ_SCOPE
  },
  {
    title: 'Business NXT Read/Write',
    description:
      'Read and modify Business NXT data available to the authenticated user. This initial integration only exposes read tools.',
    scope: BUSINESS_NXT_WRITE_SCOPE
  }
];
