import { createAxios } from 'slates';

export interface GenderPrediction {
  name: string;
  gender: string | null;
  probability: number | null;
  count: number;
  countryId?: string;
}

interface RawPrediction {
  name: string;
  gender: string | null;
  probability: number | null;
  count: number;
  country_id?: string;
}

export class Client {
  private axios;

  constructor(private config: { token?: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.genderize.io'
    });
  }

  async predictGender(names: string[], countryId?: string): Promise<GenderPrediction[]> {
    let params: Record<string, string | string[]> = {};

    if (names.length === 1) {
      params.name = names[0]!;
    } else {
      params['name[]'] = names;
    }

    if (countryId) {
      params.country_id = countryId;
    }

    if (this.config.token !== undefined) {
      params.apikey = this.config.token as string;
    }

    let response = await this.axios.get('/', { params });

    let results: RawPrediction[] = Array.isArray(response.data)
      ? response.data
      : [response.data];

    return results.map(r => ({
      name: r.name,
      gender: r.gender,
      probability: r.probability,
      count: r.count,
      ...(r.country_id ? { countryId: r.country_id } : {})
    }));
  }
}
