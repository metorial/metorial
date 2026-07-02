import { createAxios } from 'slates';
import {
  findChild,
  findChildren,
  getChildText,
  nodeToObject,
  parseXml,
  type XmlNode
} from './xml';

let apiAxios = createAxios({
  baseURL: 'https://api.codereadr.com/api/'
});

export class CodereadrError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'CodereadrError';
  }
}

export class Client {
  constructor(private token: string) {}

  private async post(params: Record<string, string | undefined>): Promise<XmlNode> {
    let formData = new URLSearchParams();
    formData.append('api_key', this.token);

    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    }

    let response = await apiAxios.post('', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    let xml = parseXml(response.data);
    let status = getChildText(xml, 'status');
    if (status !== '1') {
      let errorNode = findChild(xml, 'error');
      let errorCode = errorNode?.attributes?.code || 'unknown';
      let errorMessage = errorNode?.text || 'Unknown API error';
      throw new CodereadrError(errorCode, errorMessage);
    }

    return xml;
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
        serviceId: s.attributes.id
      };
      for (let child of s.children) {
        if (child.tag === 'user') {
          if (!obj.users) obj.users = [];
          obj.users.push({ userId: child.attributes.id, username: child.text });
        } else if (child.tag === 'question') {
          if (!obj.questions) obj.questions = [];
          obj.questions.push({ questionId: child.attributes.id, text: child.text });
        } else if (child.children.length === 0) {
          obj[child.tag] = child.text;
        } else {
          obj[child.tag] = nodeToObject(child);
        }
      }
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
    await this.post({
      section: 'services',
      action: 'addquestion',
      service_id: serviceId,
      question_id: questionId,
      condition: condition,
      required: required !== undefined ? (required ? '1' : '0') : undefined
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
        userId: u.attributes.id
      };
      for (let child of u.children) {
        if (child.tag === 'service') {
          if (!obj.services) obj.services = [];
          obj.services.push({ serviceId: child.attributes.id, serviceName: child.text });
        } else {
          obj[child.tag] = child.text;
        }
      }
      return obj;
    });
  }

  async createUser(params: {
    username: string;
    password?: string;
    limit?: string;
  }): Promise<string> {
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
        databaseId: d.attributes.id
      };
      for (let child of d.children) {
        if (child.tag === 'service') {
          if (!obj.services) obj.services = [];
          obj.services.push({ serviceId: child.attributes.id });
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
        value: v.text,
        response: v.attributes.response || '',
        validity: v.attributes.validity || ''
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
      if (entry.response) params[`values[${i}][response]`] = entry.response;
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
          scanId: s.attributes.id
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
        questionId: q.attributes.id
      };
      for (let child of q.children) {
        if (child.tag === 'answer') {
          if (!obj.answers) obj.answers = [];
          obj.answers.push({
            answerId: child.attributes.id,
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
        deviceId: d.attributes.id
      };
      for (let child of d.children) {
        obj[child.tag] = child.text;
      }
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
