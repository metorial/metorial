import { createAxios } from 'slates';

export interface WhoisContact {
  name: string;
  organization: string;
  streetAddress: string;
  city: string;
  region: string;
  zipCode: string;
  country: string;
  phone: string;
  fax: string;
  email: string;
}

export interface WhoisRegistrar {
  ianaId: string;
  name: string;
  url: string;
}

export interface WhoisResult {
  domain: string;
  domainId: string;
  status: string;
  createDate: string;
  updateDate: string;
  expireDate: string;
  domainAge: number;
  whoisServer: string;
  registrar: WhoisRegistrar;
  registrant: WhoisContact;
  admin: WhoisContact;
  tech: WhoisContact;
  billing: WhoisContact;
  nameservers: string[];
}

export interface HostedDomainsResult {
  ip: string;
  totalDomains: number;
  page: number;
  perPage: number;
  totalPages: number;
  domains: string[];
}

let mapContact = (raw: any): WhoisContact => ({
  name: raw?.name ?? '',
  organization: raw?.organization ?? '',
  streetAddress: raw?.street_address ?? '',
  city: raw?.city ?? '',
  region: raw?.region ?? '',
  zipCode: raw?.zip_code ?? '',
  country: raw?.country ?? '',
  phone: raw?.phone ?? '',
  fax: raw?.fax ?? '',
  email: raw?.email ?? ''
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  async lookupWhois(domain: string): Promise<WhoisResult> {
    let axios = createAxios({
      baseURL: 'https://api.ip2whois.com'
    });

    let response = await axios.get('/v2', {
      params: {
        key: this.token,
        domain,
        format: 'json'
      }
    });

    let data = response.data;

    return {
      domain: data.domain ?? '',
      domainId: data.domain_id ?? '',
      status: data.status ?? '',
      createDate: data.create_date ?? '',
      updateDate: data.update_date ?? '',
      expireDate: data.expire_date ?? '',
      domainAge: data.domain_age ?? 0,
      whoisServer: data.whois_server ?? '',
      registrar: {
        ianaId: data.registrar?.iana_id ?? '',
        name: data.registrar?.name ?? '',
        url: data.registrar?.url ?? ''
      },
      registrant: mapContact(data.registrant),
      admin: mapContact(data.admin),
      tech: mapContact(data.tech),
      billing: mapContact(data.billing),
      nameservers: data.nameservers ?? []
    };
  }

  async lookupHostedDomains(ip: string, page?: number): Promise<HostedDomainsResult> {
    let axios = createAxios({
      baseURL: 'https://domains.ip2whois.com'
    });

    let params: Record<string, any> = {
      key: this.token,
      ip,
      format: 'json'
    };

    if (page !== undefined) {
      params.page = page;
    }

    let response = await axios.get('/domains', {
      params
    });

    let data = response.data;

    return {
      ip: data.ip ?? '',
      totalDomains: data.total_domains ?? 0,
      page: data.page ?? 1,
      perPage: data.per_page ?? 0,
      totalPages: data.total_pages ?? 0,
      domains: data.domains ?? []
    };
  }
}
