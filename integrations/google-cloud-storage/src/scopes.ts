import { anyOf } from 'slates';

export let googleCloudStorageScopes = {
  devstorageReadOnly: 'https://www.googleapis.com/auth/devstorage.read_only',
  devstorageReadWrite: 'https://www.googleapis.com/auth/devstorage.read_write',
  devstorageFullControl: 'https://www.googleapis.com/auth/devstorage.full_control',
  cloudPlatform: 'https://www.googleapis.com/auth/cloud-platform',
  userinfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userinfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

let anyBucketOrObjectRead = anyOf(
  googleCloudStorageScopes.devstorageReadOnly,
  googleCloudStorageScopes.devstorageReadWrite,
  googleCloudStorageScopes.devstorageFullControl,
  googleCloudStorageScopes.cloudPlatform
);

let objectAndBucketMutate = anyOf(
  googleCloudStorageScopes.devstorageReadWrite,
  googleCloudStorageScopes.devstorageFullControl,
  googleCloudStorageScopes.cloudPlatform
);

let fullControlOrPlatform = anyOf(
  googleCloudStorageScopes.devstorageFullControl,
  googleCloudStorageScopes.cloudPlatform
);

export let googleCloudStorageActionScopes = {
  listBuckets: anyBucketOrObjectRead,
  getBucket: anyBucketOrObjectRead,
  listObjects: anyBucketOrObjectRead,
  getObject: anyBucketOrObjectRead,
  objectChanges: anyBucketOrObjectRead,
  manageBucket: objectAndBucketMutate,
  uploadObject: objectAndBucketMutate,
  deleteObject: objectAndBucketMutate,
  copyObject: objectAndBucketMutate,
  updateObjectMetadata: objectAndBucketMutate,
  manageLifecycle: objectAndBucketMutate,
  manageNotifications: objectAndBucketMutate,
  manageBucketIam: fullControlOrPlatform
} as const;
