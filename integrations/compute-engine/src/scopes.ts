import { anyOf } from 'slates';

export let computeEngineScopes = {
  compute: 'https://www.googleapis.com/auth/compute',
  computeReadonly: 'https://www.googleapis.com/auth/compute.readonly',
  cloudPlatform: 'https://www.googleapis.com/auth/cloud-platform',
  userinfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userinfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

export let computeEngineActionScopes = {
  read: anyOf(
    computeEngineScopes.computeReadonly,
    computeEngineScopes.compute,
    computeEngineScopes.cloudPlatform
  ),
  write: anyOf(computeEngineScopes.compute, computeEngineScopes.cloudPlatform)
} as const;
