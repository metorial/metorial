import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describe('gemini provider contract', () => {
  it('exposes the expected provider, tools, trigger, and API-key auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'gemini',
        name: 'Gemini',
        description:
          "Google's multimodal generative AI platform providing text, image, and Veo video generation, multimodal understanding, embeddings, code execution, and context caching through a REST API."
      },
      toolIds: [
        'generate_text',
        'generate_embeddings',
        'generate_image',
        'generate_video',
        'get_video_operation',
        'list_models',
        'get_model',
        'count_tokens',
        'upload_file',
        'list_files',
        'get_file',
        'delete_file',
        'create_cached_content',
        'list_cached_contents',
        'get_cached_content',
        'update_cached_content',
        'delete_cached_content'
      ],
      triggerIds: ['inbound_webhook'],
      authMethodIds: ['api_key'],
      tools: [
        { id: 'generate_text', readOnly: true, destructive: false },
        { id: 'generate_embeddings', readOnly: true, destructive: false },
        { id: 'generate_image', readOnly: true, destructive: false },
        { id: 'generate_video', readOnly: false, destructive: false },
        { id: 'get_video_operation', readOnly: true, destructive: false },
        { id: 'list_models', readOnly: true, destructive: false },
        { id: 'get_model', readOnly: true, destructive: false },
        { id: 'count_tokens', readOnly: true, destructive: false },
        { id: 'upload_file', readOnly: false, destructive: false },
        { id: 'list_files', readOnly: true, destructive: false },
        { id: 'get_file', readOnly: true, destructive: false },
        { id: 'delete_file', readOnly: false, destructive: true },
        { id: 'create_cached_content', readOnly: false, destructive: false },
        { id: 'list_cached_contents', readOnly: true, destructive: false },
        { id: 'get_cached_content', readOnly: true, destructive: false },
        { id: 'update_cached_content', readOnly: false, destructive: false },
        { id: 'delete_cached_content', readOnly: false, destructive: true }
      ],
      triggers: [{ id: 'inbound_webhook', invocationType: 'webhook' }]
    });

    expect(contract.actions).toHaveLength(18);

    let apiKey = await client.getAuthMethod('api_key');
    expect(apiKey.authenticationMethod.type).toBe('auth.token');
    expect(apiKey.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
  });
});
