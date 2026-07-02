import { anyOf } from 'slates';

export let googleCloudVisionScopes = {
  cloudPlatform: 'https://www.googleapis.com/auth/cloud-platform',
  cloudVision: 'https://www.googleapis.com/auth/cloud-vision'
} as const;

let visionAccess = anyOf(
  googleCloudVisionScopes.cloudVision,
  googleCloudVisionScopes.cloudPlatform
);

export let googleCloudVisionActionScopes = {
  analyzeImage: visionAccess,
  detectLabels: visionAccess,
  detectObjects: visionAccess,
  detectFaces: visionAccess,
  detectLandmarks: visionAccess,
  detectLogos: visionAccess,
  detectText: visionAccess,
  detectSafeSearch: visionAccess,
  detectImageProperties: visionAccess,
  getCropHints: visionAccess,
  detectWeb: visionAccess
} as const;
