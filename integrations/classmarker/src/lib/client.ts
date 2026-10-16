import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { generateAuthParams } from './signing';

let providerErrorCodes = new Set([
  'apiKeyAuthFail',
  'apiKeyInactive',
  'apiKeyNoGroupPermission',
  'incorrectUrl',
  'incorrectUrlVersionNumber',
  'incorrectUrlId',
  'incorrectRequestMethod',
  'rateLimitExceeded',
  'timeStampOutOfRange',
  'finishedAfterTimestampTooEarly',
  'offlineMaintenance',
  'noApiKeyExists',
  'accountNotUpgraded',
  'internalError100',
  'internalError101',
  'invalidJson',
  'NotAllowedActionForQuestionType',
  'payloadValidationError',
  'requestParamValidationError',
  'custom_error'
]);

let getProviderError = (body: unknown): { code?: string; message?: string } => {
  let details: string[] = [];
  let code: string | undefined;
  let visit = (value: unknown, depth: number) => {
    if (depth > 6 || details.length >= 5) return;
    if (typeof value === 'string' && value.trim()) {
      if (providerErrorCodes.has(value.trim())) code ??= value.trim();
      details.push(value.trim());
    } else if (Array.isArray(value)) {
      for (let item of value) visit(item, depth + 1);
    } else if (isApiErrorRecord(value)) {
      for (let [key, item] of Object.entries(value)) {
        if (
          ['code', 'error_code', 'errorCode'].includes(key) &&
          (typeof item === 'string' || typeof item === 'number')
        ) {
          code ??= String(item);
        } else if (['message', 'error_message', 'description', 'detail'].includes(key)) {
          visit(item, depth + 1);
        } else if (['error', 'errors', 'validation_errors'].includes(key)) {
          visit(item, depth + 1);
        } else if (providerErrorCodes.has(key)) {
          // ClassMarker also represents errors as { providerErrorCode: message }.
          code ??= key;
          visit(item, depth + 1);
        }
      }
    }
  };
  if (isApiErrorRecord(body)) visit(body.errors ?? body.error ?? body, 0);
  else if (typeof body === 'string' && !body.trim().startsWith('<')) visit(body, 0);
  return {
    code,
    message: details.length ? [...new Set(details)].join(' - ').slice(0, 1000) : code
  };
};

export class ClassMarkerClient {
  constructor(private auth: { token: string; apiSecret: string }) {
    if (!auth.token.trim() || !auth.apiSecret.trim()) {
      throw createApiServiceError('A ClassMarker API key and API secret are required.');
    }
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    params: Record<string, unknown> = {},
    data?: unknown
  ): Promise<Record<string, any>> {
    let ax = createAxios({
      baseURL: 'https://api.classmarker.com',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    try {
      let response = await ax.request({
        method,
        url: path,
        params: {
          ...generateAuthParams(this.auth.token, this.auth.apiSecret),
          ...pickDefined(params)
        },
        data
      });
      if (!isApiErrorRecord(response.data)) {
        throw createApiServiceError('ClassMarker returned an invalid JSON response.');
      }
      if (response.data.status === 'error' || response.data.errors || response.data.error) {
        let failure = getProviderError(response.data);
        throw createApiServiceError(
          `ClassMarker API request failed: ${failure.message ?? 'Unknown provider error'}`,
          {
            reason: 'classmarker_api_error',
            upstreamStatus: response.status,
            upstreamCode: failure.code
          }
        );
      }
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'ClassMarker',
        reason: 'classmarker_api_error',
        operation: `${method} ${path}`,
        extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
        extractMessage: (value, helpers) =>
          getProviderError(helpers.getResponseWithBody(value)?.data).message,
        extractUpstreamCode: (_value, response) => getProviderError(response?.data).code
      });
    }
  }

  getGroupsLinksTests() {
    return this.request('GET', '/v1.json');
  }

  getGroupRecentResults(params: { finishedAfterTimestamp: number; limit?: number }) {
    return this.request('GET', '/v1/groups/recent_results.json', params);
  }

  getLinkRecentResults(params: { finishedAfterTimestamp: number; limit?: number }) {
    return this.request('GET', '/v1/links/recent_results.json', params);
  }

  getGroupTestResults(
    groupId: number,
    testId: number,
    params: { finishedAfterTimestamp: number; limit?: number }
  ) {
    return this.request(
      'GET',
      `/v1/groups/${groupId}/tests/${testId}/recent_results.json`,
      params
    );
  }

  getLinkTestResults(
    linkId: number,
    testId: number,
    params: { finishedAfterTimestamp: number; limit?: number }
  ) {
    return this.request(
      'GET',
      `/v1/links/${linkId}/tests/${testId}/recent_results.json`,
      params
    );
  }

  getCategories() {
    return this.request('GET', '/v1/categories.json');
  }

  createParentCategory(name: string, verifyOnly?: boolean) {
    return this.request(
      'POST',
      '/v1/categories/parent_category.json',
      { verify_only: verifyOnly },
      { parent_category_name: name }
    );
  }

  updateParentCategory(parentCategoryId: number, name: string, verifyOnly?: boolean) {
    return this.request(
      'PUT',
      `/v1/categories/parent_category/${parentCategoryId}.json`,
      { verify_only: verifyOnly },
      { parent_category_name: name }
    );
  }

  createSubcategory(name: string, parentCategoryId: number, verifyOnly?: boolean) {
    return this.request(
      'POST',
      '/v1/categories/category.json',
      { verify_only: verifyOnly },
      { category_name: name, parent_category_id: parentCategoryId }
    );
  }

  updateSubcategory(
    categoryId: number,
    data: { categoryName?: string; parentCategoryId?: number },
    verifyOnly?: boolean
  ) {
    return this.request(
      'PUT',
      `/v1/category/${categoryId}.json`,
      { verify_only: verifyOnly },
      pickDefined({
        category_name: data.categoryName,
        parent_category_id: data.parentCategoryId
      })
    );
  }

  getQuestions(page?: number) {
    return this.request('GET', '/v1/questions.json', { page });
  }

  getQuestion(questionId: number) {
    return this.request('GET', `/v1/questions/${questionId}.json`);
  }

  createQuestion(data: Record<string, unknown>, verifyOnly?: boolean) {
    return this.request('POST', '/v1/questions.json', { verify_only: verifyOnly }, data);
  }

  updateQuestion(questionId: number, data: Record<string, unknown>, verifyOnly?: boolean) {
    return this.request(
      'PUT',
      `/v1/questions/${questionId}.json`,
      { verify_only: verifyOnly },
      data
    );
  }

  addAccessCodes(accessListId: number, codes: string[]) {
    return this.request('POST', `/v1/accesslists/${accessListId}.json`, {}, codes);
  }

  removeAccessCodes(accessListId: number, codes: string[]) {
    return this.request('DELETE', `/v1/accesslists/${accessListId}.json`, {}, codes);
  }
}
