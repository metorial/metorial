import type { RecordData } from './client';

const names: Record<string, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  middleName: 'middle_name',
  streetAddress: 'street_address',
  postalCode: 'postal_code',
  birthDate: 'birth_date',
  minLikelihood: 'min_likelihood'
};
export const personParams = (input: RecordData): RecordData => {
  const params: RecordData = {};
  for (const key of [
    'name',
    'firstName',
    'lastName',
    'middleName',
    'email',
    'phone',
    'company',
    'school',
    'location',
    'locality',
    'region',
    'country',
    'streetAddress',
    'postalCode',
    'birthDate',
    'minLikelihood',
    'titlecase'
  ])
    if (input[key] !== undefined) params[names[key] ?? key] = input[key];
  const profiles = ['linkedinUrl', 'facebookUrl', 'twitterUrl', 'githubUrl']
    .map(key => input[key])
    .filter(value => typeof value === 'string' && value.trim());
  if (profiles.length) params.profile = profiles;
  return params;
};
export const companyParams = (input: RecordData): RecordData => {
  const params: RecordData = {};
  for (const key of [
    'name',
    'website',
    'ticker',
    'location',
    'locality',
    'region',
    'country',
    'streetAddress',
    'postalCode',
    'titlecase'
  ])
    if (input[key] !== undefined) params[names[key] ?? key] = input[key];
  if (input.linkedinUrl) params.profile = input.linkedinUrl;
  return params;
};
