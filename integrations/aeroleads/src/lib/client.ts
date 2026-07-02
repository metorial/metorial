import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://aeroleads.com'
});

export class Client {
  private apiKey: string;

  constructor(config: { token: string }) {
    this.apiKey = config.token;
  }

  async getLinkedInDetails(linkedinUrl: string) {
    let response = await http.get('/api/get_linkedin_details', {
      params: {
        linkedin_url: linkedinUrl,
        api_key: this.apiKey
      }
    });
    return response.data;
  }

  async getCompanyEmail(firstName: string, lastName: string, company: string) {
    let response = await http.get('/api/get_company_email', {
      params: {
        first_name: firstName,
        last_name: lastName,
        company: company,
        api_key: this.apiKey
      }
    });
    return response.data;
  }
}
