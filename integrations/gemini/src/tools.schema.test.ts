import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { generateVideo, getVideoOperation } from './tools';

describeMcpCompatibleToolSchemas('Gemini tool input schemas', provider.actions);

describe('Gemini Veo input schemas', () => {
  it('keeps generate_video as a top-level object with documented Veo controls', () => {
    let schema = z.toJSONSchema(generateVideo.inputSchema) as {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };

    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties ?? {})).toEqual([
      'model',
      'prompt',
      'imageBase64',
      'imageMimeType',
      'lastFrameBase64',
      'lastFrameMimeType',
      'negativePrompt',
      'aspectRatio',
      'durationSeconds',
      'resolution',
      'personGeneration',
      'seed',
      'numberOfVideos',
      'waitSeconds'
    ]);
    expect(schema.required).toEqual(['model', 'prompt']);
  });

  it('requires only the operation name for get_video_operation', () => {
    let schema = z.toJSONSchema(getVideoOperation.inputSchema) as {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };

    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties ?? {})).toEqual(['operationName']);
    expect(schema.required).toEqual(['operationName']);
  });
});
