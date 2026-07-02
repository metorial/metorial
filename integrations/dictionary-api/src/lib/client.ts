import { createAxios } from 'slates';
import type { DictionaryEntry } from './types';

let http = createAxios({
  baseURL: 'https://api.dictionaryapi.dev/api/v2'
});

export class DictionaryClient {
  private languageCode: string;

  constructor(config: { languageCode: string }) {
    this.languageCode = config.languageCode;
  }

  async lookupWord(word: string, languageCode?: string): Promise<DictionaryEntry[]> {
    let lang = languageCode || this.languageCode;
    let response = await http.get<DictionaryEntry[]>(
      `/entries/${encodeURIComponent(lang)}/${encodeURIComponent(word)}`
    );
    return response.data;
  }
}
