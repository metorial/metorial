import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

// Branching generation and transform inputs must stay compatible with the tool bridge.
describeMcpCompatibleToolSchemas('DreamStudio tool input schemas', provider.actions);

describe('DreamStudio downloadable file replacements', () => {
  for (let [legacy, replacement] of [
    ['generate_image', 'generate_image_file'],
    ['edit_image', 'transform_image'],
    ['replace_background', 'transform_image'],
    ['upscale_image', 'transform_image'],
    ['control_image', 'transform_image'],
    ['generate_3d', 'generate_3d_file']
  ]) {
    it(`preserves ${legacy} and advertises ${replacement}`, () => {
      let old = provider.actions.find(
        action => action.type === 'tool' && action.key === legacy
      );
      let current = provider.actions.find(
        action => action.type === 'tool' && action.key === replacement
      );
      expect(old).toBeDefined();
      expect(current).toBeDefined();
      if (old?.type !== 'tool') throw new Error(`Legacy tool ${legacy} is absent.`);
      expect(old.tags?.deprecated).toBe(true);
      expect(old.description).toContain(`DEPRECATED — use \`${replacement}\` instead.`);
      expect(old.outputSchema?.toJSONSchema().properties).toHaveProperty('base64');
      expect(old.outputSchema?.toJSONSchema().required).toContain('base64');
    });
  }
  it('retains the retired video key without advertising an available hosted service', () => {
    let tool = provider.actions.find(
      action => action.type === 'tool' && action.key === 'generate_video'
    );
    expect(tool?.type).toBe('tool');
    if (tool?.type !== 'tool') throw new Error('Legacy video tool is absent.');
    expect(tool.tags?.deprecated).toBe(true);
    expect(tool.description).toContain('July 24, 2025');
    expect(tool.outputSchema?.toJSONSchema().required).toContain('base64');
  });
});
