import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  decodeApiErrorBody
} from 'slates';
import {
  findChild,
  findChildren,
  getAttribute,
  getChildText,
  nodeToObject,
  parseXml,
  type XmlNode
} from './xml';

let apiAxios = createAxios({
  baseURL: 'https://api.codereadr.com/api/',
  errorMapping: { extractResponseData: response => decodeApiErrorBody(response.data) }
});

let publicText = (text: string, secrets: string[]): string => {
  for (let secret of secrets) {
    if (secret) {
      text = text.split(secret).join('[redacted]');
      text = text.split(encodeURIComponent(secret)).join('[redacted]');
    }
  }
  return text.replace(
    /([?&](?:api[_-]?key|access[_-]?token|token|password|secret)=)[^&#\s]*/gi,
    '$1[redacted]'
  );
};

let sanitizeXml = (node: XmlNode, secrets: string[]): XmlNode => ({
  ...node,
  text: /^(?:api[_-]?key|access[_-]?token|token|password|secret)$/i.test(node.tag)
    ? '[redacted]'
    : publicText(node.text, secrets),
  attributes: Object.fromEntries(
    Object.entries(node.attributes).map(([key, value]) => [
      key,
      /^(?:api[_-]?key|access[_-]?token|token|password|secret)$/i.test(key)
        ? '[redacted]'
        : publicText(value, secrets)
    ])
  ),
  children: node.children.map(child => sanitizeXml(child, secrets))
});

let providerError = (
  data: unknown,
  secrets: string[]
): { message: string; code?: string } | undefined => {
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    let bytes =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    data = new TextDecoder().decode(bytes);
  }
  if (typeof data !== 'string') return undefined;
  try {
    let node = findChild(parseXml(data), 'error');
    if (node?.text.trim())
      return {
        message: publicText(node.text.trim(), secrets),
        code: node.attributes.code ? publicText(node.attributes.code, secrets) : undefined
      };
  } catch {
    /* HTTP gateway bodies need not be XML. */
  }
  return undefined;
};

let requireInteger = (
  value: string | undefined,
  name: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER
) => {
  if (
    value !== undefined &&
    (!/^-?\d+$/.test(value) ||
      !Number.isSafeInteger(Number(value)) ||
      Number(value) < min ||
      Number(value) > max)
  ) {
    throw createApiServiceError(`${name} must be an integer between ${min} and ${max}.`);
  }
};

export class Client {
  constructor(private token: string) {}

  private requestError(error: unknown, operation: string, secrets: string[]) {
    return buildApiServiceError(error, {
      providerLabel: 'CodeREADr',
      reason: 'codereadr_api_error',
      operation,
      parent: {},
      formatMessage: ({ providerLabel, operation, statusLabel, message }) =>
        publicText(
          `${providerLabel} API ${operation} failed: ${statusLabel}${message}`,
          secrets
        ),
      extractResponse: (source, helpers) => {
        let response = helpers.getResponseWithBody(source);
        return response
          ? { ...response, data: providerError(response.data, secrets) }
          : undefined;
      },
      extractMessage: (source, helpers) =>
        providerError(helpers.getResponseWithBody(source)?.data, secrets)?.message ??
        'The request could not be completed. Check your API key, permissions, and request parameters.',
      extractUpstreamCode: (_source, response) => {
        let data = response?.data;
        return data &&
          typeof data === 'object' &&
          'code' in data &&
          typeof data.code === 'string'
          ? data.code
          : undefined;
      }
    });
  }

  private readResponse(data: unknown, secrets: string[]): XmlNode {
    let xml = parseXml(data);
    if (xml.tag !== 'xml')
      throw createApiServiceError('CodeREADr returned an unexpected response.', {
        reason: 'invalid_provider_response'
      });
    let status = getChildText(xml, 'status').trim();
    if (status !== '1') {
      let error = providerError(data, secrets);
      throw createApiServiceError(
        `CodeREADr API request failed: ${error?.message ?? 'The provider rejected the request.'}`,
        {
          reason: 'codereadr_api_error',
          upstreamCode: error?.code
        }
      );
    }
    return sanitizeXml(xml, secrets);
  }

  private async post(params: Record<string, string | undefined>): Promise<XmlNode> {
    if (!this.token.trim())
      throw createApiServiceError('A CodeREADr API key is required. Reconnect your account.');
    requireInteger(params.limit, 'limit', params.section === 'users' ? -1 : 0);
    requireInteger(params.offset, 'offset', 0);
    if (
      params.section === 'services' &&
      [
        params.postback_receiver_only,
        params.postback_real_time_scans,
        params.postback_uploaded_scans
      ].some(value => value !== undefined)
    ) {
      if (!params.postback_url?.trim())
        throw createApiServiceError(
          'postbackUrl is required when setting postback handling options.'
        );
      if (params.validation_method === 'postback')
        throw createApiServiceError(
          'Postback handling options apply only to non-postback service types.'
        );
    }
    if (params.offset !== undefined && params.limit === undefined)
      throw createApiServiceError('Provide limit when using offset.');
    if (params.start_time !== undefined && !params.start_date)
      throw createApiServiceError('Provide startDate when using startTime.');
    if (params.end_time !== undefined && !params.end_date)
      throw createApiServiceError('Provide endDate when using endTime.');
    let formData = new URLSearchParams({ api_key: this.token });
    for (let [key, value] of Object.entries(params))
      if (value !== undefined) formData.append(key, value);
    let secrets = [this.token, params.password ?? ''];
    try {
      let response = await apiAxios.post('', formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        responseType: 'text',
        maxRedirects: 0
      });
      return this.readResponse(response.data, secrets);
    } catch (error) {
      throw this.requestError(error, `${params.section} ${params.action}`, secrets);
    }
  }

  // ========== SERVICES ==========

  async retrieveServices(serviceId?: string): Promise<any[]> {
    let xml = await this.post({
      section: 'services',
      action: 'retrieve',
      service_id: serviceId || 'all'
    });

    let services = findChildren(xml, 'service');
    return services.map(s => {
      let obj: Record<string, any> = {
        serviceId: getAttribute(s, 'id')
      };
      for (let child of s.children) {
        if (child.tag === 'user') {
          if (!obj.users) obj.users = [];
          obj.users.push({ userId: getAttribute(child, 'id'), username: child.text });
        } else if (child.tag === 'question') {
          if (!obj.questions) obj.questions = [];
          obj.questions.push({ questionId: getAttribute(child, 'id'), text: child.text });
        } else if (child.children.length === 0) {
          obj[child.tag] = child.text;
        } else {
          obj[child.tag] = nodeToObject(child);
        }
      }
      if (typeof obj.validationmethod === 'string')
        obj.validationMethod = obj.validationmethod;
      if (typeof obj.duplicateScanValue === 'string')
        obj.duplicateValue = obj.duplicateScanValue;
      return obj;
    });
  }

  async createService(params: {
    validationMethod: string;
    name?: string;
    description?: string;
    databaseId?: string;
    postbackUrl?: string;
    duplicateValue?: string;
    deviceDuplicateValue?: string;
    periodStartDate?: string;
    periodStartTime?: string;
    periodEndDate?: string;
    periodEndTime?: string;
    uploadEmail?: string;
    uploadEmailFormat?: string;
    postbackReceiverOnly?: string;
    postbackRealTimeScans?: string;
    postbackUploadedScans?: string;
  }): Promise<string> {
    if (
      ['database', 'ondevicedatabase'].includes(params.validationMethod) &&
      !params.databaseId?.trim()
    )
      throw createApiServiceError(
        'databaseId is required for database validation. Call list_databases to discover a database.'
      );
    if (params.validationMethod === 'postback' && !params.postbackUrl?.trim())
      throw createApiServiceError('postbackUrl is required for postback validation.');
    if (params.validationMethod === 'webview' && !params.description?.trim())
      throw createApiServiceError(
        'description must contain the web content for a webview service.'
      );
    let xml = await this.post({
      section: 'services',
      action: 'create',
      validation_method: params.validationMethod,
      service_name: params.name,
      description: params.description,
      database_id: params.databaseId,
      postback_url: params.postbackUrl,
      duplicate_value: params.duplicateValue,
      device_duplicate_value: params.deviceDuplicateValue,
      period_start_date: params.periodStartDate,
      period_start_time: params.periodStartTime,
      period_end_date: params.periodEndDate,
      period_end_time: params.periodEndTime,
      upload_email: params.uploadEmail,
      upload_email_format: params.uploadEmailFormat,
      postback_receiver_only: params.postbackReceiverOnly,
      postback_real_time_scans: params.postbackRealTimeScans,
      postback_uploaded_scans: params.postbackUploadedScans
    });

    return getChildText(xml, 'id');
  }

  async updateService(
    serviceId: string,
    params: {
      name?: string;
      symbologies?: string;
      description?: string;
      validationMethod?: string;
      databaseId?: string;
      postbackUrl?: string;
      duplicateValue?: string;
      deviceDuplicateValue?: string;
      periodStartDate?: string;
      periodStartTime?: string;
      periodEndDate?: string;
      periodEndTime?: string;
      uploadEmail?: string;
      uploadEmailFormat?: string;
      postbackReceiverOnly?: string;
      postbackRealTimeScans?: string;
      postbackUploadedScans?: string;
    }
  ): Promise<void> {
    await this.post({
      section: 'services',
      action: 'update',
      service_id: serviceId,
      service_name: params.name,
      symbologies: params.symbologies,
      description: params.description,
      validation_method: params.validationMethod,
      database_id: params.databaseId,
      postback_url: params.postbackUrl,
      duplicate_value: params.duplicateValue,
      device_duplicate_value: params.deviceDuplicateValue,
      period_start_date: params.periodStartDate,
      period_start_time: params.periodStartTime,
      period_end_date: params.periodEndDate,
      period_end_time: params.periodEndTime,
      upload_email: params.uploadEmail,
      upload_email_format: params.uploadEmailFormat,
      postback_receiver_only: params.postbackReceiverOnly,
      postback_real_time_scans: params.postbackRealTimeScans,
      postback_uploaded_scans: params.postbackUploadedScans
    });
  }

  async deleteService(serviceId: string): Promise<void> {
    await this.post({
      section: 'services',
      action: 'delete',
      service_id: serviceId
    });
  }

  async addUserPermission(serviceId: string, userId: string): Promise<void> {
    await this.post({
      section: 'services',
      action: 'adduserpermission',
      service_id: serviceId,
      user_id: userId
    });
  }

  async revokeUserPermission(serviceId: string, userId: string): Promise<void> {
    await this.post({
      section: 'services',
      action: 'revokeuserpermission',
      service_id: serviceId,
      user_id: userId
    });
  }

  async addQuestionToService(
    serviceId: string,
    questionId: string,
    condition?: string,
    required?: boolean
  ): Promise<void> {
    let mandatoryIds = required ? questionId : undefined;
    if (required && questionId.trim() === 'all') {
      let questions = await this.retrieveQuestions();
      mandatoryIds =
        questions.length > 0
          ? questions.map(question => question.questionId).join(',')
          : undefined;
    }
    await this.post({
      section: 'services',
      action: 'addquestion',
      service_id: serviceId,
      question_id: questionId,
      condition: condition,
      required: mandatoryIds
    });
  }

  async removeQuestionFromService(serviceId: string, questionId: string): Promise<void> {
    await this.post({
      section: 'services',
      action: 'removequestion',
      service_id: serviceId,
      question_id: questionId
    });
  }

  // ========== USERS ==========

  async retrieveUsers(userId?: string): Promise<any[]> {
    let xml = await this.post({
      section: 'users',
      action: 'retrieve',
      user_id: userId || 'all'
    });

    let users = findChildren(xml, 'user');
    return users.map(u => {
      let obj: Record<string, any> = {
        userId: getAttribute(u, 'id')
      };
      for (let child of u.children) {
        if (child.tag === 'service') {
          if (!obj.services) obj.services = [];
          obj.services.push({ serviceId: getAttribute(child, 'id'), serviceName: child.text });
        } else {
          obj[child.tag] = child.text;
        }
      }
      if (typeof obj.created === 'string') obj.createdAt = obj.created;
      return obj;
    });
  }

  async createUser(params: {
    username: string;
    password?: string;
    limit?: string;
  }): Promise<string> {
    if (!params.username.includes('@') && !params.password)
      throw createApiServiceError(
        'password is required when username is not an email address.'
      );
    let xml = await this.post({
      section: 'users',
      action: 'create',
      username: params.username,
      password: params.password,
      limit: params.limit
    });

    return getChildText(xml, 'id');
  }

  async updateUser(
    userId: string,
    params: {
      username?: string;
      password?: string;
      limit?: string;
    }
  ): Promise<void> {
    await this.post({
      section: 'users',
      action: 'update',
      user_id: userId,
      username: params.username,
      password: params.password,
      limit: params.limit
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.post({
      section: 'users',
      action: 'delete',
      user_id: userId
    });
  }

  // ========== DATABASES ==========

  async retrieveDatabases(databaseId?: string): Promise<any[]> {
    let xml = await this.post({
      section: 'databases',
      action: 'retrieve',
      database_id: databaseId || 'all'
    });

    let databases = findChildren(xml, 'database');
    return databases.map(d => {
      let obj: Record<string, any> = {
        databaseId: getAttribute(d, 'id')
      };
      for (let child of d.children) {
        if (child.tag === 'service') {
          if (!obj.services) obj.services = [];
          obj.services.push({ serviceId: getAttribute(child, 'id') });
        } else {
          obj[child.tag] = child.text;
        }
      }
      return obj;
    });
  }

  async createDatabase(name: string, caseSensitivity?: boolean): Promise<string> {
    let xml = await this.post({
      section: 'databases',
      action: 'create',
      database_name: name,
      case_sensitivity:
        caseSensitivity !== undefined ? (caseSensitivity ? '1' : '0') : undefined
    });

    return getChildText(xml, 'id');
  }

  async updateDatabase(databaseId: string, name: string): Promise<void> {
    await this.post({
      section: 'databases',
      action: 'update',
      database_id: databaseId,
      database_name: name
    });
  }

  async deleteDatabase(databaseId: string): Promise<void> {
    await this.post({
      section: 'databases',
      action: 'delete',
      database_id: databaseId
    });
  }

  async clearDatabase(databaseId: string): Promise<void> {
    await this.post({
      section: 'databases',
      action: 'clear',
      database_id: databaseId
    });
  }

  async showDatabaseValues(
    databaseId: string,
    params?: {
      value?: string;
      valueLike?: string;
      response?: string;
      responseLike?: string;
      validity?: string;
      limit?: string;
      offset?: string;
    }
  ): Promise<{ count: string; values: any[] }> {
    let xml = await this.post({
      section: 'databases',
      action: 'showvalues',
      database_id: databaseId,
      value: params?.value,
      valuelike: params?.valueLike,
      response: params?.response,
      responselike: params?.responseLike,
      validity: params?.validity,
      limit: params?.limit,
      offset: params?.offset
    });

    let count = getChildText(xml, 'count');
    let values = findChildren(xml, 'value');
    return {
      count,
      values: values.map(v => ({
        value: getChildText(v, 'id'),
        response: (() => {
          let response = findChild(v, 'response');
          if (!response)
            throw createApiServiceError(
              'CodeREADr returned a database value without response text.',
              { reason: 'invalid_provider_response' }
            );
          return response.text;
        })(),
        validity: getAttribute(v, 'validity')
      }))
    };
  }

  async addDatabaseValue(
    databaseId: string,
    value: string,
    response?: string,
    validity?: string
  ): Promise<void> {
    await this.post({
      section: 'databases',
      action: 'addvalue',
      database_id: databaseId,
      value,
      response,
      validity
    });
  }

  async upsertDatabaseValue(
    databaseId: string,
    value: string,
    response?: string,
    validity?: string
  ): Promise<void> {
    await this.post({
      section: 'databases',
      action: 'upsertvalue',
      database_id: databaseId,
      value,
      response,
      validity
    });
  }

  async editDatabaseValue(
    databaseId: string,
    value: string,
    response?: string,
    validity?: string
  ): Promise<void> {
    await this.post({
      section: 'databases',
      action: 'editvalue',
      database_id: databaseId,
      value,
      response,
      validity
    });
  }

  async deleteDatabaseValue(databaseId: string, value: string): Promise<void> {
    await this.post({
      section: 'databases',
      action: 'deletevalue',
      database_id: databaseId,
      value
    });
  }

  async upsertMultiValues(
    databaseId: string | undefined,
    values: Array<{
      value: string;
      databaseId?: string;
      response?: string;
      validity?: string;
    }>
  ): Promise<void> {
    let params: Record<string, string | undefined> = {
      section: 'databases',
      action: 'upsertmultivalue',
      database_id: databaseId
    };

    for (let i = 0; i < values.length; i++) {
      let entry = values[i]!;
      params[`values[${i}][value]`] = entry.value;
      if (entry.databaseId) params[`values[${i}][database_id]`] = entry.databaseId;
      if (entry.response !== undefined) params[`values[${i}][response]`] = entry.response;
      if (entry.validity !== undefined) params[`values[${i}][validity]`] = entry.validity;
    }

    await this.post(params);
  }

  // ========== SCANS ==========

  async retrieveScans(params?: {
    serviceId?: string;
    userId?: string;
    deviceId?: string;
    scanId?: string;
    uploadId?: string;
    showProperties?: boolean;
    includeProperty?: string;
    excludeProperty?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    limit?: string;
    offset?: string;
    value?: string;
    valueLike?: string;
    response?: string;
    responseLike?: string;
    keyword?: string;
    orderBy?: string;
    timezone?: string;
    onlyRecent?: string;
  }): Promise<{ count: string; scans: any[] }> {
    let xml = await this.post({
      section: 'scans',
      action: 'retrieve',
      service_id: params?.serviceId,
      user_id: params?.userId,
      device_id: params?.deviceId,
      scan_id: params?.scanId,
      upload_id: params?.uploadId,
      showProperties:
        params?.showProperties === undefined ? undefined : params.showProperties ? '1' : '0',
      includeProperty: params?.includeProperty,
      excludeProperty: params?.excludeProperty,
      status: params?.status,
      start_date: params?.startDate,
      end_date: params?.endDate,
      start_time: params?.startTime,
      end_time: params?.endTime,
      limit: params?.limit,
      offset: params?.offset,
      value: params?.value,
      valuelike: params?.valueLike,
      response: params?.response,
      responselike: params?.responseLike,
      keyword: params?.keyword,
      order_by: params?.orderBy,
      timezone: params?.timezone,
      only_recent: params?.onlyRecent
    });

    let count = getChildText(xml, 'count');
    let scans = findChildren(xml, 'scan');
    return {
      count,
      scans: scans.map(s => {
        let obj: Record<string, any> = {
          scanId: getAttribute(s, 'id')
        };
        for (let child of s.children) {
          if (child.tag === 'answer') {
            if (!obj.answers) obj.answers = [];
            obj.answers.push({
              questionId: child.attributes.qid,
              answerText: child.text
            });
          } else if (child.tag === 'properties') {
            obj.properties = {};
            for (let prop of child.children) {
              obj.properties[prop.tag] = prop.text;
            }
          } else {
            obj[child.tag] = child.text;
            if (
              ['device', 'service', 'user'].includes(child.tag) &&
              child.attributes.id !== undefined
            ) {
              obj[`${child.tag}Id`] = getAttribute(child, 'id');
            }
          }
        }
        return obj;
      })
    };
  }

  async deleteScans(scanIds: string): Promise<void> {
    await this.post({
      section: 'scans',
      action: 'delete',
      scan_id: scanIds
    });
  }

  // ========== QUESTIONS ==========

  async retrieveQuestions(questionId?: string): Promise<any[]> {
    let xml = await this.post({
      section: 'questions',
      action: 'retrieve',
      question_id: questionId || 'all'
    });

    let questions = findChildren(xml, 'question');
    return questions.map(q => {
      let obj: Record<string, any> = {
        questionId: getAttribute(q, 'id')
      };
      for (let child of q.children) {
        if (child.tag === 'answer') {
          if (!obj.answers) obj.answers = [];
          obj.answers.push({
            answerId: getAttribute(child, 'id'),
            answerText: child.text
          });
        } else {
          obj[child.tag] = child.text;
        }
      }
      return obj;
    });
  }

  async createQuestion(text: string, type?: string): Promise<string> {
    let xml = await this.post({
      section: 'questions',
      action: 'create',
      question_text: text,
      question_type: type
    });

    return getChildText(xml, 'id');
  }

  async deleteQuestion(questionId: string): Promise<void> {
    await this.post({
      section: 'questions',
      action: 'delete',
      question_id: questionId
    });
  }

  async addAnswer(questionId: string, answerText: string): Promise<string> {
    let xml = await this.post({
      section: 'questions',
      action: 'addanswer',
      question_id: questionId,
      answer_text: answerText
    });

    return getChildText(xml, 'id');
  }

  async deleteAnswer(answerId: string): Promise<void> {
    await this.post({
      section: 'questions',
      action: 'deleteanswer',
      answer_id: answerId
    });
  }

  // ========== DEVICES ==========

  async retrieveDevices(deviceId?: string): Promise<any[]> {
    let xml = await this.post({
      section: 'devices',
      action: 'retrieve',
      device_id: deviceId || 'all'
    });

    let devices = findChildren(xml, 'device');
    return devices.map(d => {
      let obj: Record<string, any> = {
        deviceId: getAttribute(d, 'id')
      };
      for (let child of d.children) {
        obj[child.tag] = child.text;
      }
      if (typeof obj.devicename === 'string') obj.deviceName = obj.devicename;
      if (typeof obj.created === 'string') obj.createdAt = obj.created;
      return obj;
    });
  }

  async updateDevice(deviceId: string, deviceName: string): Promise<void> {
    await this.post({
      section: 'devices',
      action: 'update',
      device_id: deviceId,
      device_name: deviceName
    });
  }

  // ========== BARCODE GENERATION ==========

  async generateBarcodeFile(params: {
    value: string;
    size?: string;
    barcodeType?: string;
    fileType?: string;
    hideValue?: boolean;
    text?: string;
    textSize?: string;
    textAlignment?: string;
    errorCorrection?: string;
  }): Promise<{ content: Response; mimeType: string; filename: string }> {
    if (!this.token.trim())
      throw createApiServiceError('A CodeREADr API key is required. Reconnect your account.');
    if (Array.from(params.value).length > 500)
      throw createApiServiceError('Barcode values must contain at most 500 characters.');
    requireInteger(params.size, 'size', 1, 10);
    requireInteger(params.textSize, 'textSize', 1, 30);
    let query = new URLSearchParams({
      section: 'barcode',
      action: 'generate',
      value: params.value
    });
    for (let [key, value] of Object.entries({
      size: params.size,
      barcodetype: params.barcodeType,
      filetype: params.fileType?.toUpperCase(),
      hidevalue: params.hideValue === undefined ? undefined : params.hideValue ? '1' : '0',
      text: params.text,
      textsize: params.textSize,
      textalignment: params.textAlignment,
      errorcorrection: params.errorCorrection
    }))
      if (value !== undefined) query.append(key, value);
    query.set('api_key', this.token);
    try {
      let response = await apiAxios.post(
        'https://barcode.codereadr.com/api/',
        query.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          responseType: 'arraybuffer',
          maxRedirects: 0
        }
      );
      let bytes = new Uint8Array(response.data);
      let mimeType: string;
      let extension: string;
      if (
        bytes.length >= 45 &&
        [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte) &&
        new TextDecoder().decode(bytes.slice(12, 16)) === 'IHDR' &&
        new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(16) > 0 &&
        new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(20) > 0 &&
        new TextDecoder().decode(bytes.slice(-8, -4)) === 'IEND'
      ) {
        mimeType = 'image/png';
        extension = 'png';
      } else if (
        bytes.length > 20 &&
        bytes[0] === 255 &&
        bytes[1] === 216 &&
        bytes[2] === 255 &&
        bytes.at(-2) === 255 &&
        bytes.at(-1) === 217
      ) {
        mimeType = 'image/jpeg';
        extension = 'jpg';
      } else if (
        bytes.length >= 32 &&
        new TextDecoder().decode(bytes.slice(0, 6)).match(/^GIF8[79]a$/) &&
        bytes.at(-1) === 59
      ) {
        mimeType = 'image/gif';
        extension = 'gif';
      } else {
        this.readResponse(new TextDecoder().decode(bytes), [this.token]);
        throw createApiServiceError('CodeREADr did not return a supported barcode image.', {
          reason: 'invalid_provider_response'
        });
      }
      return {
        content: new Response(bytes, { headers: { 'Content-Type': mimeType } }),
        mimeType,
        filename: `barcode.${extension}`
      };
    } catch (error) {
      throw this.requestError(error, 'barcode generation', [this.token]);
    }
  }

  async updateQuestion(questionId: string, text: string, externalId?: string): Promise<void> {
    if (externalId !== undefined && !/^[A-Za-z0-9_-]*$/.test(externalId))
      throw createApiServiceError(
        'externalId may contain only letters, numbers, underscores, and hyphens.'
      );
    await this.post({
      section: 'questions',
      action: 'update',
      question_id: questionId,
      question_text: text,
      external_id: externalId
    });
  }

  async retrieveLimits(): Promise<Array<{ metric: string; limit: string; left: string }>> {
    let xml = await this.post({ section: 'limits', action: 'retrieve' });
    return xml.children
      .filter(child => child.tag !== 'status')
      .map(child => ({
        metric: child.tag,
        limit: getAttribute(child, 'limit'),
        left: getAttribute(child, 'left')
      }));
  }

  async retrieveUploads(params: {
    serviceId?: string;
    userId?: string;
    deviceId?: string;
    limit?: string;
    offset?: string;
  }): Promise<{ count: string; uploads: Array<{ uploadId: string; [key: string]: string }> }> {
    let xml = await this.post({
      section: 'uploads',
      action: 'retrieve',
      service_id: params.serviceId,
      user_id: params.userId,
      device_id: params.deviceId,
      limit: params.limit,
      offset: params.offset
    });
    return {
      count: getChildText(xml, 'count'),
      uploads: findChildren(xml, 'upload').map(node => ({
        ...node.attributes,
        uploadId: getAttribute(node, 'id')
      }))
    };
  }

  async generateBarcode(params: {
    value: string;
    size?: string;
    barcodeType?: string;
    fileType?: string;
    hideValue?: boolean;
    text?: string;
    textSize?: string;
    textAlignment?: string;
    errorCorrection?: string;
  }): Promise<string> {
    let queryParams = new URLSearchParams();
    queryParams.append('section', 'barcode');
    queryParams.append('action', 'generate');
    queryParams.append('api_key', this.token);
    queryParams.append('value', params.value);
    if (params.size) queryParams.append('size', params.size);
    if (params.barcodeType) queryParams.append('barcodetype', params.barcodeType);
    if (params.fileType) queryParams.append('filetype', params.fileType);
    if (params.hideValue) queryParams.append('hidevalue', '1');
    if (params.text) queryParams.append('text', params.text);
    if (params.textSize) queryParams.append('textsize', params.textSize);
    if (params.textAlignment) queryParams.append('textalignment', params.textAlignment);
    if (params.errorCorrection) queryParams.append('errorcorrection', params.errorCorrection);

    return `https://barcode.codereadr.com/api/?${queryParams.toString()}`;
  }
}
