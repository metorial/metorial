import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export const API_BASE_URL = 'https://api.passslot.com/v1';

export class Client {
  private axios;

  constructor(token: string) {
    if (!token?.trim()) {
      throw createApiServiceError('A PassSlot App Key is required.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: API_BASE_URL,
      auth: {
        username: token,
        password: ''
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'PassSlot',
          reason: 'passslot_api_error'
        })
    });
  }

  private resourceId(id: number, name: string): number {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw createApiServiceError(`${name} must be a positive integer.`);
    }
    return id;
  }

  private passPath(passTypeIdentifier: string, serialNumber: string): string {
    if (!passTypeIdentifier.trim() || !serialNumber.trim()) {
      throw createApiServiceError('passTypeIdentifier and serialNumber are required.');
    }
    return `/passes/${encodeURIComponent(passTypeIdentifier)}/${encodeURIComponent(serialNumber)}`;
  }

  getPassDownloadUrl(passTypeIdentifier: string, serialNumber: string): string {
    return `${API_BASE_URL}${this.passPath(passTypeIdentifier, serialNumber)}`;
  }

  // ── Templates ──

  async listTemplates(): Promise<any[]> {
    let response = await this.axios.get('/templates');
    return response.data;
  }

  async getTemplate(templateId: number): Promise<any> {
    let response = await this.axios.get(
      `/templates/${this.resourceId(templateId, 'templateId')}`
    );
    return response.data;
  }

  async createTemplate(data: {
    name: string;
    passType: string;
    description: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/templates', data);
    return response.data;
  }

  async updateTemplate(templateId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/templates/${this.resourceId(templateId, 'templateId')}`,
      data
    );
    return response.data;
  }

  async deleteTemplate(templateId: number): Promise<void> {
    await this.axios.delete(`/templates/${this.resourceId(templateId, 'templateId')}`);
  }

  async getTemplateUrl(templateId: number): Promise<{ url: string }> {
    let response = await this.axios.get(
      `/templates/${this.resourceId(templateId, 'templateId')}/url`
    );
    return response.data;
  }

  // ── Template Actions ──

  async getTemplateActions(templateId: number): Promise<any> {
    let response = await this.axios.get(
      `/templates/${this.resourceId(templateId, 'templateId')}/actions`
    );
    return response.data;
  }

  async updateTemplateActions(templateId: number, actions: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/templates/${this.resourceId(templateId, 'templateId')}/actions`,
      actions
    );
    return response.data;
  }

  // ── Template Images ──

  async getTemplateImages(templateId: number): Promise<any> {
    let response = await this.axios.get(
      `/templates/${this.resourceId(templateId, 'templateId')}/images`
    );
    return response.data;
  }

  async deleteTemplateImages(templateId: number): Promise<void> {
    await this.axios.delete(`/templates/${this.resourceId(templateId, 'templateId')}/images`);
  }

  // ── Template Branding ──

  async getTemplateBranding(templateId: number): Promise<any> {
    let response = await this.axios.get(
      `/templates/${this.resourceId(templateId, 'templateId')}/branding`
    );
    return response.data;
  }

  async updateTemplateBranding(
    templateId: number,
    branding: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/templates/${this.resourceId(templateId, 'templateId')}/branding`,
      branding
    );
    return response.data;
  }

  // ── Template Restrictions ──

  async getTemplateRestrictions(templateId: number): Promise<any> {
    let response = await this.axios.get(
      `/templates/${this.resourceId(templateId, 'templateId')}/restrictions`
    );
    return response.data;
  }

  async updateTemplateRestrictions(
    templateId: number,
    restrictions: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/templates/${this.resourceId(templateId, 'templateId')}/restrictions`,
      restrictions
    );
    return response.data;
  }

  // ── Template Payment ──

  async getTemplatePayment(templateId: number): Promise<any> {
    let response = await this.axios.get(
      `/templates/${this.resourceId(templateId, 'templateId')}/payment`
    );
    return response.data;
  }

  async updateTemplatePayment(templateId: number, payment: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/templates/${this.resourceId(templateId, 'templateId')}/payment`,
      payment
    );
    return response.data;
  }

  // ── Pass Generation ──

  async createPassFromTemplate(
    templateId: number,
    values: Record<string, any>
  ): Promise<{
    serialNumber: string;
    passTypeIdentifier: string;
    url: string;
  }> {
    let response = await this.axios.post(
      `/templates/${this.resourceId(templateId, 'templateId')}/pass`,
      values
    );
    return response.data;
  }

  async createPassFromTemplateName(
    templateName: string,
    values: Record<string, any>
  ): Promise<{
    serialNumber: string;
    passTypeIdentifier: string;
    url: string;
  }> {
    if (!templateName.trim()) {
      throw createApiServiceError('templateName must not be empty.');
    }
    let encodedName = encodeURIComponent(templateName);
    let response = await this.axios.post(`/templates/names/${encodedName}/pass`, values);
    return response.data;
  }

  // ── Passes ──

  async listPasses(): Promise<any[]> {
    let response = await this.axios.get('/passes');
    return response.data;
  }

  async listPassesByType(passTypeIdentifier: string): Promise<any[]> {
    if (!passTypeIdentifier.trim()) {
      throw createApiServiceError('passTypeIdentifier must not be empty.');
    }
    let response = await this.axios.get(`/passes/${encodeURIComponent(passTypeIdentifier)}`);
    return response.data;
  }

  async getPassUrl(
    passTypeIdentifier: string,
    serialNumber: string
  ): Promise<{ url: string }> {
    let response = await this.axios.get(
      `${this.passPath(passTypeIdentifier, serialNumber)}/url`
    );
    return response.data;
  }

  async getPassJson(passTypeIdentifier: string, serialNumber: string): Promise<any> {
    let response = await this.axios.get(
      `${this.passPath(passTypeIdentifier, serialNumber)}/passjson`
    );
    return response.data;
  }

  async deletePass(passTypeIdentifier: string, serialNumber: string): Promise<void> {
    await this.axios.delete(`${this.passPath(passTypeIdentifier, serialNumber)}`);
  }

  async emailPass(
    passTypeIdentifier: string,
    serialNumber: string,
    email: string
  ): Promise<void> {
    await this.axios.post(`${this.passPath(passTypeIdentifier, serialNumber)}/email`, {
      email
    });
  }

  async pushPass(passTypeIdentifier: string, serialNumber: string): Promise<void> {
    await this.axios.post(`${this.passPath(passTypeIdentifier, serialNumber)}/push`);
  }

  // ── Pass Values ──

  async getPassValues(
    passTypeIdentifier: string,
    serialNumber: string
  ): Promise<Record<string, any>> {
    let response = await this.axios.get(
      `${this.passPath(passTypeIdentifier, serialNumber)}/values`
    );
    return response.data;
  }

  async updatePassValues(
    passTypeIdentifier: string,
    serialNumber: string,
    values: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(
      `${this.passPath(passTypeIdentifier, serialNumber)}/values`,
      values
    );
    return response.data;
  }

  async updatePassSingleValue(
    passTypeIdentifier: string,
    serialNumber: string,
    placeholderName: string,
    value: string
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(
      `${this.passPath(passTypeIdentifier, serialNumber)}/values/${encodeURIComponent(placeholderName)}`,
      { value }
    );
    return response.data;
  }

  // ── Pass Status ──

  async getPassStatus(
    passTypeIdentifier: string,
    serialNumber: string
  ): Promise<{ status: string }> {
    let response = await this.axios.get(
      `${this.passPath(passTypeIdentifier, serialNumber)}/status`
    );
    return response.data;
  }

  async updatePassStatus(
    passTypeIdentifier: string,
    serialNumber: string,
    status: string
  ): Promise<{ status: string }> {
    let response = await this.axios.put(
      `${this.passPath(passTypeIdentifier, serialNumber)}/status`,
      { status }
    );
    return response.data;
  }

  // ── Pass Images ──

  async getPassImages(passTypeIdentifier: string, serialNumber: string): Promise<any> {
    let response = await this.axios.get(
      `${this.passPath(passTypeIdentifier, serialNumber)}/images`
    );
    return response.data;
  }

  async deletePassImages(passTypeIdentifier: string, serialNumber: string): Promise<void> {
    await this.axios.delete(`${this.passPath(passTypeIdentifier, serialNumber)}/images`);
  }

  // ── Pass Price ──

  async getPassPrice(passTypeIdentifier: string, serialNumber: string): Promise<any> {
    let response = await this.axios.get(
      `${this.passPath(passTypeIdentifier, serialNumber)}/price`
    );
    return response.data;
  }

  async updatePassPrice(
    passTypeIdentifier: string,
    serialNumber: string,
    price: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `${this.passPath(passTypeIdentifier, serialNumber)}/price`,
      price
    );
    return response.data;
  }

  async deletePassPrice(passTypeIdentifier: string, serialNumber: string): Promise<void> {
    await this.axios.delete(`${this.passPath(passTypeIdentifier, serialNumber)}/price`);
  }

  // ── Pass Type IDs ──

  async listPassTypes(): Promise<any[]> {
    let response = await this.axios.get('/passtypes');
    return response.data;
  }

  async getPassType(passTypeId: string): Promise<any> {
    let response = await this.axios.get(`/passtypes/${encodeURIComponent(passTypeId)}`);
    return response.data;
  }

  // ── Scanners ──

  async listScanners(): Promise<any[]> {
    let response = await this.axios.get('/scanners');
    return response.data;
  }

  async getScanner(scannerId: number): Promise<any> {
    let response = await this.axios.get(
      `/scanners/${this.resourceId(scannerId, 'scannerId')}`
    );
    return response.data;
  }

  async createScanner(data: {
    name: string;
    type: string;
    fullAccess: boolean;
    allowedTemplates?: number[];
  }): Promise<any> {
    for (let templateId of data.allowedTemplates ?? []) {
      this.resourceId(templateId, 'allowedTemplates entry');
    }
    let response = await this.axios.post('/scanners', data);
    return response.data;
  }

  async updateScanner(scannerId: number, data: Record<string, any>): Promise<any> {
    for (let templateId of data.allowedTemplates ?? []) {
      this.resourceId(templateId, 'allowedTemplates entry');
    }
    let response = await this.axios.put(
      `/scanners/${this.resourceId(scannerId, 'scannerId')}`,
      data
    );
    return response.data;
  }

  async deleteScanner(scannerId: number): Promise<void> {
    await this.axios.delete(`/scanners/${this.resourceId(scannerId, 'scannerId')}`);
  }
}
