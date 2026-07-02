import { createAxios } from 'slates';
import type { Company, IpCompanyResponse } from './types';

let companyAxios = createAxios({
  baseURL: 'https://company.bigpicture.io'
});

let ipAxios = createAxios({
  baseURL: 'https://ip.bigpicture.io'
});

export class Client {
  constructor(private config: { token: string }) {}

  private get headers() {
    return {
      Authorization: this.config.token
    };
  }

  async findCompanyByDomain(params: {
    domain: string;
    webhookUrl?: string;
    webhookId?: string;
    stream?: boolean;
  }): Promise<{ company: Company | null; status: number }> {
    let queryParams: Record<string, string> = {
      domain: params.domain
    };
    if (params.webhookUrl) {
      queryParams.webhookUrl = params.webhookUrl;
    }
    if (params.webhookId) {
      queryParams.webhookId = params.webhookId;
    }

    let path = params.stream ? '/v1/companies/find/stream' : '/v1/companies/find';

    let response = await companyAxios.get(path, {
      params: queryParams,
      headers: this.headers,
      validateStatus: (status: number) => status < 500
    });

    if (response.status === 200) {
      let data = response.data as Company;
      return { company: normalizeCompany(data), status: 200 };
    }

    if (response.status === 202) {
      return { company: null, status: 202 };
    }

    if (response.status === 404) {
      return { company: null, status: 404 };
    }

    throw new Error(
      `Unexpected response status: ${response.status} - ${JSON.stringify(response.data)}`
    );
  }

  async findCompanyByIp(ip: string): Promise<IpCompanyResponse | null> {
    let response = await ipAxios.get('/v2/companies/ip', {
      params: { ip },
      headers: this.headers,
      validateStatus: (status: number) => status < 500
    });

    if (response.status === 200) {
      let data = response.data as IpCompanyResponse;
      if (data.company) {
        data.company = normalizeCompany(data.company);
      }
      return data;
    }

    if (response.status === 404) {
      return null;
    }

    throw new Error(
      `Unexpected response status: ${response.status} - ${JSON.stringify(response.data)}`
    );
  }
}

let normalizeCompany = (data: any): Company => {
  let company = { ...data };
  // Map the API's 'id' field to 'companyId' for clarity
  if (company.id !== undefined) {
    company.companyId = company.id;
    company.id = undefined;
  }
  return company;
};
