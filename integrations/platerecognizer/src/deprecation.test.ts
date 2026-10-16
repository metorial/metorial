import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import blurLegacy from './contracts/blur-legacy.json';
import legacy from './contracts/vin-legacy.json';
import { provider } from './index';

// Freeze the original VIN contract while exposing the semantically broader OCR service.
describeMcpCompatibleToolSchemas('Plate Recognizer tool schemas', provider.actions);

describe('VIN ID compatibility and OCR replacement', () => {
  it('keeps both tools and marks the original service as deprecated', () => {
    let vin = provider.actions.find(action => action.key === 'recognize_vin');
    let ocr = provider.actions.find(action => action.key === 'recognize_text');
    expect(vin).toBeDefined();
    expect(ocr).toBeDefined();
    expect(vin?.tags?.deprecated).toBe(true);
    expect(vin?.description).toMatch(/^DEPRECATED — use `recognize_text` instead\./);
    expect(vin?.instructions?.some(item => item.includes('recognize_text'))).toBe(true);
    expect(z.toJSONSchema(vin!.inputSchema)).toEqual(legacy.input);
    expect(z.toJSONSchema(vin!.outputSchema)).toEqual(legacy.output);
  });

  it('freezes the exact legacy handler and multipart VIN request', () => {
    let source = readFileSync(new URL('./tools/recognize-vin.ts', import.meta.url), 'utf8');
    let client = readFileSync(new URL('./lib/client.ts', import.meta.url), 'utf8');
    let handler = source.split('  .handleInvocation')[1]!;
    let request = client
      .split('  async recognizeVin')[1]!
      .split('  async recognizeTrailer')[0]!;
    let hash = (value: string) => createHash('sha256').update(value).digest('hex');
    expect(hash(handler)).toBe(
      '90ba7816808eb6909407fe3694e8ccdf56d75944c06b14242ca09190f697ed0f'
    );
    expect(hash(request)).toBe(
      'b3bdb4dc1d0323df7c51a7428dfa69cc252c8d02f910cadebeec36c7117e51e2'
    );
  });
});

describe('Blur file replacement and legacy compatibility', () => {
  it('keeps the exact original schemas and advertises the file-only replacement', () => {
    let legacy = provider.actions.find(action => action.key === 'blur_image');
    let replacement = provider.actions.find(action => action.key === 'blur_image_file');
    expect(legacy).toBeDefined();
    expect(replacement).toBeDefined();
    expect(legacy?.tags?.deprecated).toBe(true);
    expect(legacy?.description).toMatch(/^DEPRECATED — use `blur_image_file` instead\./);
    expect(legacy?.instructions?.some(item => item.includes('blur_image_file'))).toBe(true);
    expect(z.toJSONSchema(legacy!.inputSchema)).toEqual(blurLegacy.input);
    expect(z.toJSONSchema(legacy!.outputSchema)).toEqual(blurLegacy.output);
    expect(provider.getToolCategoryKeys('blur_image_file')).toContain('blur');
  });

  it('freezes the exact legacy handler and provider request', () => {
    let source = readFileSync(new URL('./tools/blur-image.ts', import.meta.url), 'utf8');
    let client = readFileSync(new URL('./lib/client.ts', import.meta.url), 'utf8');
    let handler = source.split('  .handleInvocation')[1]!;
    let request = client.split('  async blurImage')[1]!.split('  async recognizeVin')[0]!;
    let hash = (value: string) => createHash('sha256').update(value).digest('hex');
    expect(hash(handler)).toBe(
      'eeb49a4a591bb5fa2aaa79a7ca8d82d25d63b28c67790b3a79921c963538d0e3'
    );
    expect(hash(request)).toBe(
      '49cd4230af67f7ecc71f7c626c0bb8062a54fb90cc18cd8971d8634c423b73f3'
    );
  });

  it('gives the replacement a metadata-only output with optional real file attributes', () => {
    let replacement = provider.actions.find(action => action.key === 'blur_image_file')!;
    let output = z.toJSONSchema(replacement.outputSchema);
    expect(output.required).toEqual(['fileProduced', 'plates', 'faces']);
    expect(Object.keys(output.properties ?? {})).toEqual([
      'fileProduced',
      'filename',
      'mimeType',
      'verifiedMimeType',
      'sizeBytes',
      'plates',
      'faces',
      'raw'
    ]);
    expect(output.properties).not.toHaveProperty('base64');
    expect(output.properties).not.toHaveProperty('blurredImageBase64');
    expect(
      replacement.outputSchema.parse({
        fileProduced: false,
        plates: [],
        faces: [],
        raw: { blur: null }
      })
    ).toEqual({ fileProduced: false, plates: [], faces: [], raw: { blur: null } });
  });
});
