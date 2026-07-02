import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://gateway.datagma.net'
});

export class Client {
  constructor(private apiId: string) {}

  private params(extra: Record<string, string | number | boolean | undefined> = {}) {
    let params: Record<string, string | number | boolean> = { apiId: this.apiId };
    for (let [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    }
    return params;
  }

  async enrichFull(options: {
    data?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    companyKeyword?: string;
    countryCode?: string;
    companyPremium?: boolean;
    companyFull?: boolean;
    companyFrench?: boolean;
    personFull?: boolean;
    phoneFull?: boolean;
    deepTraffic?: boolean;
  }) {
    let response = await http.get('/api/ingress/v2/full', {
      params: this.params({
        data: options.data,
        firstName: options.firstName,
        lastName: options.lastName,
        fullName: options.fullName,
        companyKeyword: options.companyKeyword,
        countryCode: options.countryCode,
        companyPremium: options.companyPremium,
        companyFull: options.companyFull,
        companyFrench: options.companyFrench,
        personFull: options.personFull,
        phoneFull: options.phoneFull,
        deepTraffic: options.deepTraffic
      })
    });
    return response.data;
  }

  async findEmail(options: {
    fullName: string;
    company?: string;
    findEmailV2Step?: number;
    findEmailV2Country?: string;
    linkedInSlug?: string;
  }) {
    let response = await http.get('/api/ingress/v6/findEmail', {
      params: this.params({
        fullName: options.fullName,
        company: options.company,
        findEmailV2Step: options.findEmailV2Step,
        findEmailV2Country: options.findEmailV2Country,
        linkedInSlug: options.linkedInSlug
      })
    });
    return response.data;
  }

  async searchPhone(options: {
    email?: string;
    username?: string;
    minimumMatch?: number;
    whatsappCheck?: boolean;
  }) {
    let response = await http.get('/api/ingress/v1/search', {
      params: this.params({
        email: options.email,
        username: options.username,
        minimumMatch: options.minimumMatch,
        whatsapp_check: options.whatsappCheck
      })
    });
    return response.data;
  }

  async reversePhoneLookup(options: { number: string; code?: string }) {
    let response = await http.get('/api/ingress/v1/reverse_phone_lookup', {
      params: this.params({
        number: options.number,
        code: options.code
      })
    });
    return response.data;
  }

  async reverseEmailLookup(options: { email: string }) {
    let response = await http.get('/api/ingress/v1/reverse_email', {
      params: this.params({
        email: options.email
      })
    });
    return response.data;
  }

  async detectJobChange(options: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    companyName?: string;
    jobTitle?: string;
  }) {
    let response = await http.get('/api/ingress/v4/update', {
      params: this.params({
        firstName: options.firstName,
        lastName: options.lastName,
        fullName: options.fullName,
        companyName: options.companyName,
        jobTitle: options.jobTitle
      })
    });
    return response.data;
  }

  async findPeople(options: {
    currentJobTitle?: string;
    linkedinId?: string;
    domain?: string;
    currentCompanies?: string;
    countries?: string;
    fuzzy?: boolean;
  }) {
    let response = await http.get('/api/ingress/v1/find_people', {
      params: this.params({
        currentJobTitle: options.currentJobTitle,
        linkedinId: options.linkedinId,
        domain: options.domain,
        currentCompanies: options.currentCompanies,
        countries: options.countries,
        fuzzy: options.fuzzy
      })
    });
    return response.data;
  }

  async getTwitterByUsername(options: { username?: string; linkedin?: string }) {
    let response = await http.get('/api/ingress/v1/twitter/by_username', {
      params: this.params({
        username: options.username,
        linkedin: options.linkedin
      })
    });
    return response.data;
  }

  async getTwitterByEmail(options: { email: string }) {
    let response = await http.get('/api/ingress/v1/twitter/by_email', {
      params: this.params({
        email: options.email
      })
    });
    return response.data;
  }

  async getCreditBalance() {
    let response = await http.get('/api/ingress/v1/mine', {
      params: this.params()
    });
    return response.data;
  }
}
