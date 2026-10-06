import { z } from 'zod';

export const validText = (value: string) => {
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if (code < 32 || code === 127 || (code >= 0xd800 && code <= 0xdfff)) return false;
  }
  return true;
};
export const identifier = z
  .string()
  .min(1)
  .max(200)
  .refine(validText, 'Use a valid resource identifier without control characters.');
export const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Use the native 24-character hexadecimal resource ID.');
export const host = z
  .string()
  .min(1)
  .max(253)
  .refine(value => {
    if (!validText(value) || /[\s/:?#@]/u.test(value)) return false;
    try {
      return new URL(`https://${value}`).hostname.toLowerCase() === value.toLowerCase();
    } catch {
      return false;
    }
  }, 'Use a publication hostname without a scheme, path, port, or credentials.');
export const selection = {
  publicationId: objectId
    .optional()
    .describe(
      'Exact publication ID. Call list_publications for publications you own; team members can use their known publication ID or hostname.'
    ),
  publicationHost: host
    .optional()
    .describe(
      'Publication hostname, such as example.hashnode.dev. Supply this or publicationId; omit both to use the saved publication hostname.'
    )
};
export const first = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .default(10)
  .describe('Page size, from 1 to 100. Draft connections support at most 50.');
export const cursor = z
  .string()
  .min(1)
  .max(4096)
  .refine(validText, 'Use the unchanged pagination cursor.')
  .optional();
export const token = z
  .string()
  .min(1)
  .max(8192)
  .refine(value => {
    const credential = value.replace(/^Bearer /i, '');
    return (
      credential.length > 0 &&
      Array.from(credential).every(character => {
        const code = character.codePointAt(0)!;
        return code >= 33 && code <= 126;
      })
    );
  }, 'Enter a valid ASCII personal access token without whitespace or control characters.');
