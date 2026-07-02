import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://geokeo.com/geocode/v1'
});

export interface GeokeoAddressComponents {
  name: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface GeokeoLocation {
  lat: string;
  lng: string;
}

export interface GeokeoViewport {
  northeast: GeokeoLocation;
  southwest: GeokeoLocation;
}

export interface GeokeoGeometry {
  location: GeokeoLocation;
  viewport: GeokeoViewport;
}

export interface GeokeoResult {
  class: string;
  type: string;
  address_components: GeokeoAddressComponents;
  formatted_address: string;
  geometry: GeokeoGeometry;
  osmurl: string;
  distance?: string;
}

export interface GeokeoResponse {
  results: GeokeoResult[];
  credits: string;
  status: string;
}

export class Client {
  constructor(private token: string) {}

  async forwardGeocode(params: { query: string; country?: string }): Promise<GeokeoResponse> {
    let queryParams: Record<string, string> = {
      q: params.query,
      api: this.token
    };

    if (params.country) {
      queryParams.country = params.country;
    }

    let response = await http.get<GeokeoResponse>('/search.php', {
      params: queryParams
    });

    return response.data;
  }

  async reverseGeocode(params: { lat: number; lng: number }): Promise<GeokeoResponse> {
    let response = await http.get<GeokeoResponse>('/reverse.php', {
      params: {
        lat: params.lat.toString(),
        lng: params.lng.toString(),
        api: this.token
      }
    });

    return response.data;
  }
}
