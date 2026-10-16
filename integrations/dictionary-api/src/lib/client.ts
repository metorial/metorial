import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { type DictionaryEntry, dictionaryEntriesSchema } from './types';

let http = createAxios({
  baseURL: 'https://api.dictionaryapi.dev/api/v2',
  timeout: 30000,
  headers: { Accept: 'application/json' }
});

export let getPronunciationAudioUrl = (audio?: string) => {
  if (!audio?.trim()) return undefined;
  let value = audio.startsWith('//') ? `https:${audio}` : audio;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw createApiServiceError('Dictionary API returned an invalid pronunciation URL.', {
      reason: 'dictionary_api_invalid_response'
    });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createApiServiceError('Dictionary API returned an unsupported pronunciation URL.', {
      reason: 'dictionary_api_invalid_response'
    });
  }
  return parsed.toString();
};

export class DictionaryClient {
  private languageCode: string;

  constructor(config: { languageCode: string }) {
    this.languageCode = config.languageCode;
  }

  async lookupWord(word: string, languageCode?: string): Promise<DictionaryEntry[]> {
    let lang = languageCode ?? this.languageCode;
    if (!word.trim()) {
      throw createApiServiceError('Enter a word to look up.', {
        reason: 'dictionary_api_invalid_input'
      });
    }
    if (!lang.trim()) {
      throw createApiServiceError('Enter a language code, such as en for English.', {
        reason: 'dictionary_api_invalid_input'
      });
    }

    try {
      let response = await http.get<unknown>(
        `/entries/${encodeURIComponent(lang.trim())}/${encodeURIComponent(word.trim())}`
      );
      let parsed = dictionaryEntriesSchema.safeParse(response.data);
      if (!parsed.success) {
        throw createApiServiceError(
          'Dictionary API returned invalid word data. Try the lookup again later.',
          { reason: 'dictionary_api_invalid_response' }
        );
      }
      return parsed.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Dictionary API',
        reason: 'dictionary_api_request_failed',
        operation: 'word lookup',
        extractResponse: (upstream, helpers) => helpers.getResponseWithBody(upstream),
        detailKeys: ['title', 'message', 'resolution']
      });
    }
  }
}
