import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleCloudSpeechActionScopes } from './scopes';

describe('google-cloud-speech provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-cloud-speech',
        name: 'Google Cloud Speech'
      },
      toolIds: [
        'transcribe_audio',
        'batch_transcribe_audio',
        'get_operation',
        'create_recognizer',
        'get_recognizer',
        'list_recognizers',
        'update_recognizer',
        'delete_recognizer',
        'synthesize_speech',
        'list_voices'
      ],
      triggerIds: ['inbound_webhook'],
      authMethodIds: ['google_oauth', 'api_key'],
      triggers: [{ id: 'inbound_webhook', invocationType: 'webhook' }]
    });

    expect(contract.actions).toHaveLength(11);

    let expectedScopes = {
      transcribe_audio: googleCloudSpeechActionScopes.transcribeAudio,
      batch_transcribe_audio: googleCloudSpeechActionScopes.batchTranscribeAudio,
      get_operation: googleCloudSpeechActionScopes.getOperation,
      create_recognizer: googleCloudSpeechActionScopes.createRecognizer,
      get_recognizer: googleCloudSpeechActionScopes.getRecognizer,
      list_recognizers: googleCloudSpeechActionScopes.listRecognizers,
      update_recognizer: googleCloudSpeechActionScopes.updateRecognizer,
      delete_recognizer: googleCloudSpeechActionScopes.deleteRecognizer,
      synthesize_speech: googleCloudSpeechActionScopes.synthesizeSpeech,
      list_voices: googleCloudSpeechActionScopes.listVoices
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
  });
});
