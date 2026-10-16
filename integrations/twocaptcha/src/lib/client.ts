import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';

export interface CreateTaskResponse extends Record<string, unknown> {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  taskId: number;
}

export interface TaskResultResponse extends Record<string, unknown> {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  status: string;
  solution?: Record<string, unknown>;
  cost?: string;
  ip?: string;
  createTime?: number;
  endTime?: number;
  solveCount?: number;
}

export interface BalanceResponse extends Record<string, unknown> {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  balance: number;
}

export interface ReportResponse extends Record<string, unknown> {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  status: string;
}

export interface ProxyConfig {
  proxyType?: string;
  proxyAddress?: string;
  proxyPort?: number;
  proxyLogin?: string;
  proxyPassword?: string;
}

export class TwoCaptchaClient {
  private axios: ReturnType<typeof createAxios>;
  private clientKey: string;

  constructor(config: { token: string }) {
    this.clientKey = config.token;
    this.axios = createAxios({
      baseURL: 'https://api.2captcha.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private redact(value: string): string {
    return this.clientKey ? value.split(this.clientKey).join('[redacted]') : value;
  }

  private async post(
    path: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let result: unknown;
    try {
      // Submit once: retrying createTask after a transport failure can create another paid task.
      result = (await this.axios.post(path, { clientKey: this.clientKey, ...body })).data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: '2Captcha',
        operation: path.slice(1),
        reason: 'twocaptcha_request_failed',
        extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
        detailKeys: ['errorCode', 'errorDescription'],
        extractMessage: (error, helpers) => {
          let providerDetails: string[] = [];
          helpers.collectDetails(helpers.getResponseWithBody(error)?.data, providerDetails, {
            detailKeys: ['errorCode', 'errorDescription']
          });
          let details =
            providerDetails.join(' - ') ||
            helpers.extractMessage(error, {
              fallbackMessage: 'Request failed'
            });
          details = this.redact(details);
          return path === '/createTask'
            ? `${details}. Submission may have been accepted. Check your callback or account before submitting again to avoid duplicate charges.`
            : details;
        },
        extractUpstreamCode: (_error, response) =>
          isApiErrorRecord(response?.data) && typeof response.data.errorCode === 'string'
            ? this.redact(response.data.errorCode)
            : undefined
      });
    }
    if (!isApiErrorRecord(result) || typeof result.errorId !== 'number') {
      let message = `2Captcha returned an invalid ${path.slice(1)} response.`;
      if (path === '/createTask') {
        message +=
          ' Submission may have been accepted. Check your callback or account before submitting again to avoid duplicate charges.';
      }
      throw createApiServiceError(message, { reason: 'twocaptcha_invalid_response' });
    }
    if (result.errorId !== 0) {
      let details = [result.errorCode, result.errorDescription]
        .filter((value): value is string => typeof value === 'string')
        .join(' - ');
      details = this.redact(details);
      throw createApiServiceError(
        `2Captcha ${path.slice(1)} failed: ${details || `error ${result.errorId}`}`,
        {
          reason: 'twocaptcha_api_error',
          upstreamCode:
            typeof result.errorCode === 'string' ? this.redact(result.errorCode) : undefined
        }
      );
    }
    return result;
  }

  async createTask(
    task: Record<string, unknown>,
    options?: { callbackUrl?: string; languagePool?: string; softId?: number }
  ): Promise<CreateTaskResponse> {
    let body: Record<string, unknown> = { task };
    if (options?.callbackUrl) body.callbackUrl = options.callbackUrl;
    if (options?.languagePool)
      body.languagePool = options.languagePool === 'rn' ? 'ru' : options.languagePool;
    if (options?.softId) body.softId = options.softId;
    let result = await this.post('/createTask', body);
    if (
      typeof result.taskId !== 'number' ||
      !Number.isSafeInteger(result.taskId) ||
      result.taskId <= 0
    ) {
      throw createApiServiceError(
        '2Captcha returned no valid task ID. Submission may have been accepted. Check your callback or account before submitting again to avoid duplicate charges.',
        {
          reason: 'twocaptcha_invalid_task_id'
        }
      );
    }
    return result as CreateTaskResponse;
  }

  async getTaskResult(taskId: number): Promise<TaskResultResponse> {
    let result = await this.post('/getTaskResult', { taskId });
    if (typeof result.status !== 'string' || !result.status) {
      throw createApiServiceError('2Captcha returned no task status.', {
        reason: 'twocaptcha_invalid_response'
      });
    }
    return result as TaskResultResponse;
  }

  async getBalance(): Promise<BalanceResponse> {
    let result = await this.post('/getBalance', {});
    if (typeof result.balance !== 'number' || !Number.isFinite(result.balance)) {
      throw createApiServiceError('2Captcha returned no valid account balance.', {
        reason: 'twocaptcha_invalid_response'
      });
    }
    return result as BalanceResponse;
  }

  private async report(
    path: '/reportCorrect' | '/reportIncorrect',
    taskId: number
  ): Promise<ReportResponse> {
    let result = await this.post(path, { taskId });
    if (typeof result.status !== 'string' || !result.status) {
      throw createApiServiceError(
        '2Captcha returned no report status. The report may have been accepted.',
        { reason: 'twocaptcha_invalid_response' }
      );
    }
    return result as ReportResponse;
  }

  async reportCorrect(taskId: number): Promise<ReportResponse> {
    return this.report('/reportCorrect', taskId);
  }

  async reportIncorrect(taskId: number): Promise<ReportResponse> {
    return this.report('/reportIncorrect', taskId);
  }

  buildRecaptchaV2Task(params: {
    websiteUrl: string;
    websiteKey: string;
    isInvisible?: boolean;
    recaptchaDataSValue?: string;
    isEnterprise?: boolean;
    enterprisePayload?: Record<string, unknown>;
    apiDomain?: string;
    userAgent?: string;
    cookies?: string;
    proxy?: ProxyConfig;
  }): Record<string, unknown> {
    let task: Record<string, unknown> = {
      type: params.proxy ? 'RecaptchaV2Task' : 'RecaptchaV2TaskProxyless',
      websiteURL: params.websiteUrl,
      websiteKey: params.websiteKey
    };

    if (params.isEnterprise) {
      task.type = params.proxy
        ? 'RecaptchaV2EnterpriseTask'
        : 'RecaptchaV2EnterpriseTaskProxyless';
      if (params.enterprisePayload) task.enterprisePayload = params.enterprisePayload;
    }
    if (params.isInvisible !== undefined) task.isInvisible = params.isInvisible;
    if (params.recaptchaDataSValue) task.recaptchaDataSValue = params.recaptchaDataSValue;
    if (params.apiDomain) task.apiDomain = params.apiDomain;
    if (params.userAgent) task.userAgent = params.userAgent;
    if (params.cookies) task.cookies = params.cookies;
    if (params.proxy) Object.assign(task, params.proxy);

    return task;
  }

  buildRecaptchaV3Task(params: {
    websiteUrl: string;
    websiteKey: string;
    pageAction?: string;
    minScore?: number;
    isEnterprise?: boolean;
    apiDomain?: string;
    proxy?: ProxyConfig;
  }): Record<string, unknown> {
    if (params.proxy) {
      throw createApiServiceError(
        '2Captcha does not support proxies for reCAPTCHA V3 or Enterprise V3. Remove proxy and use the proxyless task.',
        { reason: 'twocaptcha_unsupported_proxy' }
      );
    }
    let task: Record<string, unknown> = {
      type: 'RecaptchaV3TaskProxyless',
      websiteURL: params.websiteUrl,
      websiteKey: params.websiteKey
    };

    if (params.pageAction) task.pageAction = params.pageAction;
    if (params.minScore !== undefined) task.minScore = params.minScore;
    if (params.isEnterprise !== undefined) task.isEnterprise = params.isEnterprise;
    if (params.apiDomain) task.apiDomain = params.apiDomain;
    if (params.proxy) Object.assign(task, params.proxy);

    return task;
  }

  buildHCaptchaTask(params: {
    websiteUrl: string;
    websiteKey: string;
    isInvisible?: boolean;
    enterprisePayload?: Record<string, unknown>;
    userAgent?: string;
    proxy?: ProxyConfig;
  }): Record<string, unknown> {
    let task: Record<string, unknown> = {
      type: params.proxy ? 'HCaptchaTask' : 'HCaptchaTaskProxyless',
      websiteURL: params.websiteUrl,
      websiteKey: params.websiteKey
    };

    if (params.isInvisible !== undefined) task.isInvisible = params.isInvisible;
    if (params.enterprisePayload) task.enterprisePayload = params.enterprisePayload;
    if (params.userAgent) task.userAgent = params.userAgent;
    if (params.proxy) Object.assign(task, params.proxy);

    return task;
  }

  buildFunCaptchaTask(params: {
    websiteUrl: string;
    websitePublicKey: string;
    funcaptchaApiJSSubdomain?: string;
    data?: string;
    userAgent?: string;
    proxy?: ProxyConfig;
  }): Record<string, unknown> {
    let task: Record<string, unknown> = {
      type: params.proxy ? 'FunCaptchaTask' : 'FunCaptchaTaskProxyless',
      websiteURL: params.websiteUrl,
      websitePublicKey: params.websitePublicKey
    };

    if (params.funcaptchaApiJSSubdomain)
      task.funcaptchaApiJSSubdomain = params.funcaptchaApiJSSubdomain;
    if (params.data) task.data = params.data;
    if (params.userAgent) task.userAgent = params.userAgent;
    if (params.proxy) Object.assign(task, params.proxy);

    return task;
  }

  buildGeeTestTask(params: {
    websiteUrl: string;
    gt: string;
    challenge?: string;
    geetestApiServerSubdomain?: string;
    geetestGetLib?: string;
    riskType?: string;
    version?: number;
    initParameters?: Record<string, unknown>;
    proxy?: ProxyConfig;
  }): Record<string, unknown> {
    let task: Record<string, unknown> = {
      type: params.proxy ? 'GeeTestTask' : 'GeeTestTaskProxyless',
      websiteURL: params.websiteUrl,
      gt: params.gt
    };

    if (params.riskType) task.riskType = params.riskType;
    if (params.challenge) task.challenge = params.challenge;
    if (params.geetestApiServerSubdomain)
      task.geetestApiServerSubdomain = params.geetestApiServerSubdomain;
    if (params.geetestGetLib) task.geetestGetLib = params.geetestGetLib;
    if (params.version !== undefined) task.version = params.version;
    if (params.initParameters) task.initParameters = params.initParameters;
    if (params.proxy) Object.assign(task, params.proxy);

    return task;
  }

  buildTurnstileTask(params: {
    websiteUrl: string;
    websiteKey: string;
    action?: string;
    data?: string;
    pagedata?: string;
    userAgent?: string;
    proxy?: ProxyConfig;
  }): Record<string, unknown> {
    let task: Record<string, unknown> = {
      type: params.proxy ? 'TurnstileTask' : 'TurnstileTaskProxyless',
      websiteURL: params.websiteUrl,
      websiteKey: params.websiteKey
    };

    if (params.action) task.action = params.action;
    if (params.data) task.data = params.data;
    if (params.pagedata) task.pagedata = params.pagedata;
    if (params.userAgent) task.userAgent = params.userAgent;
    if (params.proxy) Object.assign(task, params.proxy);

    return task;
  }

  buildImageToTextTask(params: {
    body: string;
    phrase?: boolean;
    caseSensitive?: boolean;
    numeric?: number;
    math?: boolean;
    minLength?: number;
    maxLength?: number;
    comment?: string;
    imgInstructions?: string;
  }): Record<string, unknown> {
    let task: Record<string, unknown> = {
      type: 'ImageToTextTask',
      body: params.body
    };

    if (params.phrase !== undefined) task.phrase = params.phrase;
    if (params.caseSensitive !== undefined) task.case = params.caseSensitive;
    if (params.numeric !== undefined) task.numeric = params.numeric;
    if (params.math !== undefined) task.math = params.math;
    if (params.minLength !== undefined) task.minLength = params.minLength;
    if (params.maxLength !== undefined) task.maxLength = params.maxLength;
    if (params.comment) task.comment = params.comment;
    if (params.imgInstructions) task.imgInstructions = params.imgInstructions;

    return task;
  }

  buildTextCaptchaTask(params: { comment: string }): Record<string, unknown> {
    return {
      type: 'TextCaptchaTask',
      comment: params.comment
    };
  }
}
