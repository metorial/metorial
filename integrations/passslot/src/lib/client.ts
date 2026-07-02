import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.passslot.com/v1',
      auth: {
        username: token,
        password: ''
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Templates ──

  async listTemplates(): Promise<any[]> {
    let response = await this.axios.get('/templates');
    return response.data;
  }

  async getTemplate(templateId: number): Promise<any> {
    let response = await this.axios.get(`/templates/${templateId}`);
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
    let response = await this.axios.put(`/templates/${templateId}`, data);
    return response.data;
  }

  async deleteTemplate(templateId: number): Promise<void> {
    await this.axios.delete(`/templates/${templateId}`);
  }

  async getTemplateUrl(templateId: number): Promise<{ url: string }> {
    let response = await this.axios.get(`/templates/${templateId}/url`);
    return response.data;
  }

  // ── Template Actions ──

  async getTemplateActions(templateId: number): Promise<any> {
    let response = await this.axios.get(`/templates/${templateId}/actions`);
    return response.data;
  }

  async updateTemplateActions(templateId: number, actions: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/templates/${templateId}/actions`, actions);
    return response.data;
  }

  // ── Template Images ──

  async getTemplateImages(templateId: number): Promise<any> {
    let response = await this.axios.get(`/templates/${templateId}/images`);
    return response.data;
  }

  async deleteTemplateImages(templateId: number): Promise<void> {
    await this.axios.delete(`/templates/${templateId}/images`);
  }

  // ── Template Branding ──

  async getTemplateBranding(templateId: number): Promise<any> {
    let response = await this.axios.get(`/templates/${templateId}/branding`);
    return response.data;
  }

  async updateTemplateBranding(
    templateId: number,
    branding: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(`/templates/${templateId}/branding`, branding);
    return response.data;
  }

  // ── Template Restrictions ──

  async getTemplateRestrictions(templateId: number): Promise<any> {
    let response = await this.axios.get(`/templates/${templateId}/restrictions`);
    return response.data;
  }

  async updateTemplateRestrictions(
    templateId: number,
    restrictions: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(`/templates/${templateId}/restrictions`, restrictions);
    return response.data;
  }

  // ── Template Payment ──

  async getTemplatePayment(templateId: number): Promise<any> {
    let response = await this.axios.get(`/templates/${templateId}/payment`);
    return response.data;
  }

  async updateTemplatePayment(templateId: number, payment: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/templates/${templateId}/payment`, payment);
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
    let response = await this.axios.post(`/templates/${templateId}/pass`, values);
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
    let response = await this.axios.get(`/passes/${encodeURIComponent(passTypeIdentifier)}`);
    return response.data;
  }

  async getPassUrl(
    passTypeIdentifier: string,
    serialNumber: string
  ): Promise<{ url: string }> {
    let response = await this.axios.get(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/url`
    );
    return response.data;
  }

  async getPassJson(passTypeIdentifier: string, serialNumber: string): Promise<any> {
    let response = await this.axios.get(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/passjson`
    );
    return response.data;
  }

  async deletePass(passTypeIdentifier: string, serialNumber: string): Promise<void> {
    await this.axios.delete(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}`
    );
  }

  async emailPass(
    passTypeIdentifier: string,
    serialNumber: string,
    email: string
  ): Promise<void> {
    await this.axios.post(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/email`,
      { email }
    );
  }

  async pushPass(passTypeIdentifier: string, serialNumber: string): Promise<void> {
    await this.axios.post(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/push`
    );
  }

  // ── Pass Values ──

  async getPassValues(
    passTypeIdentifier: string,
    serialNumber: string
  ): Promise<Record<string, any>> {
    let response = await this.axios.get(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/values`
    );
    return response.data;
  }

  async updatePassValues(
    passTypeIdentifier: string,
    serialNumber: string,
    values: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/values`,
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
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/value/${encodeURIComponent(placeholderName)}`,
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
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/status`
    );
    return response.data;
  }

  async updatePassStatus(
    passTypeIdentifier: string,
    serialNumber: string,
    status: string
  ): Promise<{ status: string }> {
    let response = await this.axios.put(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/status`,
      { status }
    );
    return response.data;
  }

  // ── Pass Images ──

  async getPassImages(passTypeIdentifier: string, serialNumber: string): Promise<any> {
    let response = await this.axios.get(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/images`
    );
    return response.data;
  }

  async deletePassImages(passTypeIdentifier: string, serialNumber: string): Promise<void> {
    await this.axios.delete(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/images`
    );
  }

  // ── Pass Price ──

  async getPassPrice(passTypeIdentifier: string, serialNumber: string): Promise<any> {
    let response = await this.axios.get(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/price`
    );
    return response.data;
  }

  async updatePassPrice(
    passTypeIdentifier: string,
    serialNumber: string,
    price: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/price`,
      price
    );
    return response.data;
  }

  async deletePassPrice(passTypeIdentifier: string, serialNumber: string): Promise<void> {
    await this.axios.delete(
      `/passes/${encodeURIComponent(passTypeIdentifier)}/${serialNumber}/price`
    );
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
    let response = await this.axios.get(`/scanners/${scannerId}`);
    return response.data;
  }

  async createScanner(data: {
    name: string;
    type: string;
    fullAccess: boolean;
    allowedTemplates?: number[];
  }): Promise<any> {
    let response = await this.axios.post('/scanners', data);
    return response.data;
  }

  async updateScanner(scannerId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/scanners/${scannerId}`, data);
    return response.data;
  }

  async deleteScanner(scannerId: number): Promise<void> {
    await this.axios.delete(`/scanners/${scannerId}`);
  }
}
