import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleCloudVisionActionScopes } from './scopes';

describe('google-cloud-vision provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-cloud-vision',
        name: 'Google Cloud Vision',
        description:
          'Integrate with Google Cloud Vision API for image analysis including label detection, OCR, face detection, landmark recognition, and more.'
      },
      toolIds: [
        'analyze_image',
        'detect_labels',
        'detect_objects',
        'detect_faces',
        'detect_landmarks',
        'detect_logos',
        'detect_text',
        'detect_safe_search',
        'detect_image_properties',
        'get_crop_hints',
        'detect_web'
      ],
      triggerIds: ['inbound_webhook'],
      authMethodIds: ['google_oauth', 'api_key'],
      triggers: [{ id: 'inbound_webhook', invocationType: 'webhook' }]
    });

    expect(contract.actions).toHaveLength(12);

    let expectedScopes = {
      analyze_image: googleCloudVisionActionScopes.analyzeImage,
      detect_labels: googleCloudVisionActionScopes.detectLabels,
      detect_objects: googleCloudVisionActionScopes.detectObjects,
      detect_faces: googleCloudVisionActionScopes.detectFaces,
      detect_landmarks: googleCloudVisionActionScopes.detectLandmarks,
      detect_logos: googleCloudVisionActionScopes.detectLogos,
      detect_text: googleCloudVisionActionScopes.detectText,
      detect_safe_search: googleCloudVisionActionScopes.detectSafeSearch,
      detect_image_properties: googleCloudVisionActionScopes.detectImageProperties,
      get_crop_hints: googleCloudVisionActionScopes.getCropHints,
      detect_web: googleCloudVisionActionScopes.detectWeb
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
  });
});
