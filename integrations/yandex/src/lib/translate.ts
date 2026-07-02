import { type AuthType, createServiceClient } from './client';

let BASE_URL = 'https://translate.api.cloud.yandex.net';

export let translateText = async (
  auth: AuthType,
  params: {
    folderId: string;
    texts: string[];
    targetLanguageCode: string;
    sourceLanguageCode?: string;
    format?: 'PLAIN_TEXT' | 'HTML';
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/translate/v2/translate', params);
  return response.data;
};

export let detectLanguage = async (
  auth: AuthType,
  params: {
    folderId: string;
    text: string;
    languageCodeHints?: string[];
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/translate/v2/detect', params);
  return response.data;
};

export let listLanguages = async (auth: AuthType, folderId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/translate/v2/languages', { folderId });
  return response.data;
};
