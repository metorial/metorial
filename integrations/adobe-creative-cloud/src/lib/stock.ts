import { type AdobeAuthConfig, createAdobeAxios } from './client';

let STOCK_BASE_URL = 'https://stock.adobe.io';

export class StockClient {
  private http;

  constructor(auth: AdobeAuthConfig) {
    this.http = createAdobeAxios(STOCK_BASE_URL, auth);
  }

  async search(params: {
    keywords?: string;
    limit?: number;
    offset?: number;
    filters?: {
      contentType?:
        | 'photo'
        | 'illustration'
        | 'vector'
        | 'video'
        | 'template'
        | '3d'
        | 'audio';
      orientation?: 'horizontal' | 'vertical' | 'square' | 'panoramic';
      hasReleases?: 'true' | 'false' | 'all';
      age?: string;
      videoDuration?: string;
      colors?: string;
      premium?: 'true' | 'false' | 'all';
    };
    resultColumns?: string[];
  }) {
    let searchParams: Record<string, any> = {
      'search_parameters[words]': params.keywords,
      'search_parameters[limit]': params.limit || 20,
      'search_parameters[offset]': params.offset || 0
    };

    if (params.filters) {
      if (params.filters.contentType) {
        let typeMap: Record<string, number> = {
          photo: 1,
          illustration: 2,
          vector: 3,
          video: 4,
          template: 5,
          '3d': 6,
          audio: 7
        };
        searchParams[
          `search_parameters[filters][content_type:${params.filters.contentType}]`
        ] = 1;
        if (typeMap[params.filters.contentType]) {
          searchParams[
            `search_parameters[filters][content_type:${params.filters.contentType}]`
          ] = 1;
        }
      }
      if (params.filters.orientation) {
        searchParams['search_parameters[filters][orientation]'] = params.filters.orientation;
      }
      if (params.filters.hasReleases) {
        searchParams['search_parameters[filters][has_releases]'] = params.filters.hasReleases;
      }
      if (params.filters.premium) {
        searchParams['search_parameters[filters][premium]'] = params.filters.premium;
      }
    }

    let columns = params.resultColumns || [
      'id',
      'title',
      'thumbnail_url',
      'thumbnail_width',
      'thumbnail_height',
      'width',
      'height',
      'creator_name',
      'content_type',
      'is_licensed',
      'media_type_id',
      'category',
      'keywords'
    ];
    for (let col of columns) {
      searchParams[`result_columns[]`] = col;
    }

    let response = await this.http.get('/Rest/Media/1/Search/Files', {
      params: searchParams
    });
    return response.data;
  }

  async getContentInfo(contentId: string, resultColumns?: string[]) {
    let columns = resultColumns || [
      'id',
      'title',
      'thumbnail_url',
      'width',
      'height',
      'creator_name',
      'content_type',
      'is_licensed',
      'description',
      'keywords',
      'category',
      'nb_results'
    ];

    let params: Record<string, any> = {
      ids: contentId
    };
    for (let col of columns) {
      params[`result_columns[]`] = col;
    }

    let response = await this.http.get('/Rest/Media/1/Files', { params });
    return response.data;
  }

  async licenseContent(contentId: string, licenseState?: string) {
    let response = await this.http.get('/Rest/Libraries/1/Content/License', {
      params: {
        content_id: contentId,
        ...(licenseState ? { license: licenseState } : {})
      }
    });
    return response.data;
  }

  async getLicenseInfo(contentId: string) {
    let response = await this.http.get('/Rest/Libraries/1/Content/Info', {
      params: {
        content_id: contentId
      }
    });
    return response.data;
  }

  async getMemberProfile(params?: { licenseState?: string; locale?: string }) {
    let response = await this.http.get('/Rest/Libraries/1/Member/Profile', {
      params: {
        ...(params?.licenseState ? { license: params.licenseState } : {}),
        ...(params?.locale ? { locale: params.locale } : {})
      }
    });
    return response.data;
  }

  async getLicenseHistory(params?: { limit?: number; offset?: number }) {
    let response = await this.http.get('/Rest/Libraries/1/Member/LicenseHistory', {
      params: {
        'search_parameters[limit]': params?.limit || 20,
        'search_parameters[offset]': params?.offset || 0,
        'result_columns[]': [
          'id',
          'title',
          'thumbnail_url',
          'width',
          'height',
          'creator_name',
          'content_type',
          'license_date'
        ]
      }
    });
    return response.data;
  }
}
