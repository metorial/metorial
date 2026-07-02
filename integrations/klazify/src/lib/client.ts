import { createAxios } from 'slates';

export class KlazifyClient {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://www.klazify.com/api',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  async categorize(url: string) {
    let response = await this.axios.post('/categorize', { url });
    return response.data;
  }

  async realTimeCategorization(url: string) {
    let response = await this.axios.post('/real_time_categorization', { url });
    return response.data;
  }

  async iabCategories(url: string) {
    let response = await this.axios.post('/domain_iab_categories', { url });
    return response.data;
  }

  async companyData(url: string) {
    let response = await this.axios.post('/domain_company', { url });
    return response.data;
  }

  async techStack(url: string) {
    let response = await this.axios.post('/domain_tech', { url });
    return response.data;
  }

  async logo(url: string) {
    let response = await this.axios.post('/domain_logo', { url });
    return response.data;
  }

  async socialMedia(url: string) {
    let response = await this.axios.post('/domain_social_media', { url });
    return response.data;
  }

  async domainExpiration(url: string) {
    let response = await this.axios.post('/domain_expiration', { url });
    return response.data;
  }

  async similarDomains(url: string) {
    let response = await this.axios.post('/similar_domain', { url });
    return response.data;
  }

  async parkedDomain(url: string) {
    let response = await this.axios.post('/domain_parked', { url });
    return response.data;
  }
}
