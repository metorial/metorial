import { z } from 'zod';
import { ocrspaceServiceError } from '../lib/errors';

export let languageEnum = z.enum([
  'ara',
  'bul',
  'chs',
  'cht',
  'hrv',
  'cze',
  'dan',
  'dut',
  'eng',
  'fin',
  'fre',
  'ger',
  'gre',
  'hun',
  'kor',
  'ita',
  'jpn',
  'pol',
  'por',
  'rus',
  'slv',
  'spa',
  'swe',
  'tha',
  'tur',
  'ukr',
  'vnm',
  'auto'
]);

let hasValue = (value: string | undefined) =>
  typeof value === 'string' && value.trim().length > 0;

export let validateSingleSource = (input: { sourceUrl?: string; base64Image?: string }) => {
  let sourceCount = Number(hasValue(input.sourceUrl)) + Number(hasValue(input.base64Image));

  if (sourceCount !== 1) {
    throw ocrspaceServiceError(
      'Provide exactly one input source: either "sourceUrl" or "base64Image".'
    );
  }
};

export let validateLanguageForEngine = (language: string, ocrEngine: string) => {
  if (language === 'auto' && ocrEngine === '1') {
    throw ocrspaceServiceError('Language "auto" requires OCR Engine 2 or OCR Engine 3.');
  }
};
