import { anyOf } from 'slates';

export let googleCloudFunctionsScopes = {
  cloudPlatform: 'https://www.googleapis.com/auth/cloud-platform',
  cloudFunctions: 'https://www.googleapis.com/auth/cloudfunctions',
  cloudPlatformReadonly: 'https://www.googleapis.com/auth/cloud-platform.read-only',
  userinfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userinfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

// Cloud Functions v2 read methods also require the cloud-platform scope.
let readOps = anyOf(googleCloudFunctionsScopes.cloudPlatform);

let writeOps = anyOf(googleCloudFunctionsScopes.cloudPlatform);

export let googleCloudFunctionsActionScopes = {
  listFunctions: readOps,
  getFunction: readOps,
  listRuntimes: readOps,
  getOperation: anyOf(
    googleCloudFunctionsScopes.cloudPlatform,
    googleCloudFunctionsScopes.cloudFunctions
  ),
  generateDownloadUrl: readOps,
  createFunction: writeOps,
  updateFunction: writeOps,
  deleteFunction: writeOps,
  generateUploadUrl: writeOps,
  manageIamPolicy: writeOps,
  functionChanges: readOps
} as const;
