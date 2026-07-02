import { anyOf } from 'slates';

export let googleAddressValidationScopes = {
  cloudPlatform: 'https://www.googleapis.com/auth/cloud-platform'
} as const;

let addressValidationAccess = anyOf(googleAddressValidationScopes.cloudPlatform);

export let googleAddressValidationActionScopes = {
  validateAddress: addressValidationAccess,
  provideValidationFeedback: addressValidationAccess
} as const;
