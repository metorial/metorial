import type { GoogleOAuthScopeDescriptor } from '@slates/oauth-google';

export let superGoogle3Scopes = {
  cloudPlatform: 'https://www.googleapis.com/auth/cloud-platform',
  userinfoEmail: 'https://www.googleapis.com/auth/userinfo.email',
  userinfoProfile: 'https://www.googleapis.com/auth/userinfo.profile'
} as const;

// P3 (cloud project) Console declaration, mirrored from scopes_projects_google.md §4.
export let superGoogle3ScopeEnvelope = [
  'https://www.googleapis.com/auth/compute',
  'https://www.googleapis.com/auth/compute.readonly',
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/cloud-platform.read-only',
  'https://www.googleapis.com/auth/bigquery',
  'https://www.googleapis.com/auth/bigquery.readonly',
  'https://www.googleapis.com/auth/bigquery.insertdata',
  'https://www.googleapis.com/auth/devstorage.full_control',
  'https://www.googleapis.com/auth/devstorage.read_write',
  'https://www.googleapis.com/auth/devstorage.read_only',
  'https://www.googleapis.com/auth/cloud-vision',
  'https://www.googleapis.com/auth/firebase.database',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
] as const;

type SuperGoogle3Scope = (typeof superGoogle3ScopeEnvelope)[number];

let describe = (title: string, description: string) => ({ title, description });

// Typed against the envelope so a missing or extra entry fails compilation.
let superGoogle3ScopeCopy: Record<SuperGoogle3Scope, { title: string; description: string }> =
  {
    'https://www.googleapis.com/auth/compute': describe(
      'Compute Engine',
      'View and manage Compute Engine resources.'
    ),
    'https://www.googleapis.com/auth/compute.readonly': describe(
      'Compute Engine read',
      'View Compute Engine resources.'
    ),
    'https://www.googleapis.com/auth/cloud-platform': describe(
      'Google Cloud Platform',
      'View and manage the Google Cloud and Firebase resources exposed by this integration.'
    ),
    'https://www.googleapis.com/auth/cloud-platform.read-only': describe(
      'Google Cloud Platform read',
      'View Google Cloud data across enabled services.'
    ),
    'https://www.googleapis.com/auth/bigquery': describe(
      'BigQuery',
      'View and manage BigQuery datasets, tables, and jobs.'
    ),
    'https://www.googleapis.com/auth/bigquery.readonly': describe(
      'BigQuery read',
      'View BigQuery datasets and tables.'
    ),
    'https://www.googleapis.com/auth/bigquery.insertdata': describe(
      'BigQuery insert',
      'Insert data into BigQuery tables.'
    ),
    'https://www.googleapis.com/auth/devstorage.full_control': describe(
      'Cloud Storage full control',
      'Manage Cloud Storage buckets, objects, and their access controls.'
    ),
    'https://www.googleapis.com/auth/devstorage.read_write': describe(
      'Cloud Storage read/write',
      'Read and write Cloud Storage buckets and objects.'
    ),
    'https://www.googleapis.com/auth/devstorage.read_only': describe(
      'Cloud Storage read',
      'View Cloud Storage buckets and objects.'
    ),
    'https://www.googleapis.com/auth/cloud-vision': describe(
      'Cloud Vision',
      'Analyze images with the Cloud Vision API.'
    ),
    'https://www.googleapis.com/auth/firebase.database': describe(
      'Firebase Realtime Database',
      'View and manage Firebase Realtime Database data.'
    ),
    'https://www.googleapis.com/auth/userinfo.email': describe(
      'Google Account Email',
      'View the Google Account email used to identify this connection.'
    ),
    'https://www.googleapis.com/auth/userinfo.profile': describe(
      'Google Account Profile',
      'View the basic Google Account profile used to identify this connection.'
    )
  };

// The consent screen requests the complete P3 project declaration, including scopes that
// back planned tools, so the verified consent matches the Console declaration exactly.
export let superGoogle3OAuthScopes = superGoogle3ScopeEnvelope.map(scope => ({
  ...superGoogle3ScopeCopy[scope],
  scope
})) satisfies GoogleOAuthScopeDescriptor[];

export let superGoogle3ProfileScopes = [
  superGoogle3Scopes.userinfoEmail,
  superGoogle3Scopes.userinfoProfile
] as const;

// Requested and declared for planned tools; referenced by no retained tool clause today.
// The remaining envelope scopes appear as narrower alternatives in retained tool clauses.
export let superGoogle3FutureToolScopes = [
  'https://www.googleapis.com/auth/bigquery',
  'https://www.googleapis.com/auth/bigquery.readonly',
  'https://www.googleapis.com/auth/bigquery.insertdata'
] as const;

// Google-restricted scopes declared in the P1 project (scopes_projects_google.md §4, plus
// drive.meet.readonly, which Google also classifies as restricted). None may appear in P3.
export let restrictedP1Scopes = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.delete',
  'https://www.googleapis.com/auth/drive.meet.readonly'
] as const;
