import { anyOf } from 'slates';

export let googleCloudFunctionsScopes = {
  cloudPlatform: 'https://www.googleapis.com/auth/cloud-platform',
  cloudPlatformReadonly: 'https://www.googleapis.com/auth/cloud-platform.read-only',
  userinfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userinfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

let readOps = anyOf(
  googleCloudFunctionsScopes.cloudPlatform,
  googleCloudFunctionsScopes.cloudPlatformReadonly
);

let writeOps = anyOf(googleCloudFunctionsScopes.cloudPlatform);

export let googleCloudFunctionsActionScopes = {
  listFunctions: readOps,
  getFunction: readOps,
  listRuntimes: readOps,
  getOperation: readOps,
  generateDownloadUrl: readOps,
  createFunction: writeOps,
  updateFunction: writeOps,
  deleteFunction: writeOps,
  generateUploadUrl: writeOps,
  manageIamPolicy: writeOps,
  functionChanges: readOps
} as const;
