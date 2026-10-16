import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('ElevenLabs audio tool input schemas', provider.actions);

let pairs = [
  [
    'text_to_speech',
    'generate_speech',
    'text-to-speech',
    '72dbf10be829bf76602c6e25ecd5c56b1f6664ab08f356f450a08c13b796ce29'
  ],
  [
    'generate_sound_effect',
    'generate_sound_effect_file',
    'generate-sound-effect',
    '98c68f60698f2a36ca46ac01ef1831a25fab86589f354ab912f5a545122905c9'
  ],
  [
    'isolate_audio',
    'isolate_audio_file',
    'isolate-audio',
    '27bd29149e3eb547b97a48578b0a01d543db7442dbcc960e5b4ee38e7264d117'
  ],
  [
    'design_voice',
    'design_voice_previews',
    'design-voice',
    '77d5dec1328e37840c27f61892b90b7e8a565ca586bfe1eada9e7369ce075388'
  ]
] as const;

describe('Legacy audio tool deprecation contracts', () => {
  for (let [oldKey, newKey, file, frozenHash] of pairs) {
    it(`${oldKey} remains frozen and points to ${newKey}`, async () => {
      let legacy = provider.actions.find(action => action.key === oldKey);
      let replacement = provider.actions.find(action => action.key === newKey);
      expect(legacy).toBeDefined();
      expect(replacement).toBeDefined();
      expect(legacy?.tags?.deprecated).toBe(true);
      expect(legacy?.description).toMatch(/^DEPRECATED — use/);
      expect(legacy?.description).toContain(newKey);
      expect(legacy?.instructions?.some(instruction => instruction.includes(newKey))).toBe(
        true
      );
      let source = await readFile(new URL(`./tools/${file}.ts`, import.meta.url), 'utf8');
      let frozen = source.slice(source.indexOf('  .input('));
      expect(createHash('sha256').update(frozen).digest('hex')).toBe(frozenHash);
      if (!replacement) throw new Error('Replacement tool is missing');
      let schema = z.toJSONSchema(replacement.outputSchema, { unrepresentable: 'any' });
      expect(JSON.stringify(schema)).not.toMatch(/audioBase64|audio_base_64|"raw"/);
    });
  }
});
