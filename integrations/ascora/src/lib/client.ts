import { createAxios } from 'slates';

let BASE_URL = 'https://api.ascora.com.au';

export class AscoraClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private getAxios() {
    return createAxios({
      baseURL: BASE_URL,
      headers: {
        Auth: this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async listCustomers(): Promise<any[]> {
    let http = this.getAxios();
    let response = await http.get('/Customers/Customers');
    return response.data ?? [];
  }

  async submitEnquiry(enquiry: {
    companyName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    mobile?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressSuburb?: string;
    addressState?: string;
    addressPostcode?: string;
    addressCountry?: string;
    enquiryDescription?: string;
    customFields?: Array<{ fieldName: string; fieldValue: string }>;
  }): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/Enquiry', enquiry);
    return response.data;
  }
}

export class AscoraAccountingClient {
  private username: string;
  private password: string;

  constructor(config: { username: string; password: string }) {
    this.username = config.username;
    this.password = config.password;
  }

  private getAxios() {
    return createAxios({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      auth: {
        username: this.username,
        password: this.password
      }
    });
  }

  async getInvoices(invoicesPriorToDate?: string, companyId?: string): Promise<any[]> {
    let http = this.getAxios();
    let path = companyId ? `/invoicedetails/${companyId}` : '/invoicedetails';
    let params: Record<string, string> = {};
    if (invoicesPriorToDate) {
      params.InvoicesPriorToDate = invoicesPriorToDate;
    }
    let response = await http.get(path, { params });
    let data = response.data;
    return data?.Results ?? data ?? [];
  }

  async markInvoices(invoiceIds: string[]): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/MarkInvoice', {
      InvoiceIds: invoiceIds
    });
    return response.data;
  }

  async getPayments(): Promise<any[]> {
    let http = this.getAxios();
    let response = await http.get('/payments');
    let data = response.data;
    return data?.Results ?? data ?? [];
  }

  async markPayments(paymentIds: string[]): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/MarkPayment', {
      PaymentIds: paymentIds
    });
    return response.data;
  }
}
