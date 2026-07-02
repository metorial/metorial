import { createAxios } from 'slates';

export interface CreateTaskResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  taskId?: number;
}

export interface TaskResultResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  status?: string;
  solution?: Record<string, unknown>;
  cost?: string;
  ip?: string;
  createTime?: number;
  endTime?: number;
  solveCount?: number;
}

export interface BalanceResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  balance?: number;
}

export interface ReportResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  status?: string;
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
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async createTask(
    task: Record<string, unknown>,
    options?: {
      callbackUrl?: string;
      languagePool?: string;
      softId?: number;
    }
  ): Promise<CreateTaskResponse> {
    let body: Record<string, unknown> = {
      clientKey: this.clientKey,
      task
    };

    if (options?.callbackUrl) body.callbackUrl = options.callbackUrl;
    if (options?.languagePool) body.languagePool = options.languagePool;
    if (options?.softId) body.softId = options.softId;

    let response = await this.axios.post('/createTask', body);
    return response.data as CreateTaskResponse;
  }

  async getTaskResult(taskId: number): Promise<TaskResultResponse> {
    let response = await this.axios.post('/getTaskResult', {
      clientKey: this.clientKey,
      taskId
    });
    return response.data as TaskResultResponse;
  }

  async getBalance(): Promise<BalanceResponse> {
    let response = await this.axios.post('/getBalance', {
      clientKey: this.clientKey
    });
    return response.data as BalanceResponse;
  }

  async reportCorrect(taskId: number): Promise<ReportResponse> {
    let response = await this.axios.post('/reportCorrect', {
      clientKey: this.clientKey,
      taskId
    });
    return response.data as ReportResponse;
  }

  async reportIncorrect(taskId: number): Promise<ReportResponse> {
    let response = await this.axios.post('/reportIncorrect', {
      clientKey: this.clientKey,
      taskId
    });
    return response.data as ReportResponse;
  }

  buildRecaptchaV2Task(params: {
    websiteUrl: string;
    websiteKey: string;
    isInvisible?: boolean;
    recaptchaDataSValue?: string;
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
    let task: Record<string, unknown> = {
      type: params.proxy ? 'RecaptchaV3Task' : 'RecaptchaV3TaskProxyless',
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
    version?: number;
    initParameters?: Record<string, unknown>;
    proxy?: ProxyConfig;
  }): Record<string, unknown> {
    let task: Record<string, unknown> = {
      type: params.proxy ? 'GeeTestTask' : 'GeeTestTaskProxyless',
      websiteURL: params.websiteUrl,
      gt: params.gt
    };

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
