import { createAxios } from 'slates';

let makeAxios = (baseURL: string) => createAxios({ baseURL });

export class AbstractClient {
  private tokens: {
    emailValidationToken?: string;
    phoneValidationToken?: string;
    ipGeolocationToken?: string;
    companyEnrichmentToken?: string;
    exchangeRatesToken?: string;
    holidaysToken?: string;
    timezoneToken?: string;
    webScrapingToken?: string;
    screenshotToken?: string;
    imageProcessingToken?: string;
    avatarsToken?: string;
    vatToken?: string;
    ibanToken?: string;
  };

  constructor(tokens: AbstractClient['tokens']) {
    this.tokens = tokens;
  }

  private requireToken(tokenKey: keyof AbstractClient['tokens'], serviceName: string): string {
    let token = this.tokens[tokenKey];
    if (!token) {
      throw new Error(
        `API key for ${serviceName} is not configured. Please provide the ${tokenKey} in your authentication settings.`
      );
    }
    return token;
  }

  async validateEmail(params: { email: string; autoCorrect?: boolean }) {
    let token = this.requireToken('emailValidationToken', 'Email Validation');
    let axios = makeAxios('https://emailvalidation.abstractapi.com/v1/');
    let response = await axios.get('', {
      params: {
        api_key: token,
        email: params.email,
        auto_correct: params.autoCorrect ?? false
      }
    });
    return response.data;
  }

  async validatePhone(params: { phone: string }) {
    let token = this.requireToken('phoneValidationToken', 'Phone Validation');
    let axios = makeAxios('https://phonevalidation.abstractapi.com/v1/');
    let response = await axios.get('', {
      params: {
        api_key: token,
        phone: params.phone
      }
    });
    return response.data;
  }

  async geolocateIp(params: { ipAddress?: string; fields?: string }) {
    let token = this.requireToken('ipGeolocationToken', 'IP Geolocation');
    let axios = makeAxios('https://ipgeolocation.abstractapi.com/v1/');
    let queryParams: Record<string, string> = { api_key: token };
    if (params.ipAddress) queryParams.ip_address = params.ipAddress;
    if (params.fields) queryParams.fields = params.fields;
    let response = await axios.get('', { params: queryParams });
    return response.data;
  }

  async enrichCompany(params: { domain?: string; email?: string }) {
    let token = this.requireToken('companyEnrichmentToken', 'Company Enrichment');
    let axios = makeAxios('https://companyenrichment.abstractapi.com/v1/');
    let queryParams: Record<string, string> = { api_key: token };
    if (params.domain) queryParams.domain = params.domain;
    if (params.email) queryParams.email = params.email;
    let response = await axios.get('', { params: queryParams });
    return response.data;
  }

  async getLiveExchangeRates(params: { base: string; target?: string }) {
    let token = this.requireToken('exchangeRatesToken', 'Exchange Rates');
    let axios = makeAxios('https://exchange-rates.abstractapi.com/v1/');
    let queryParams: Record<string, string> = {
      api_key: token,
      base: params.base
    };
    if (params.target) queryParams.target = params.target;
    let response = await axios.get('live', { params: queryParams });
    return response.data;
  }

  async getHistoricalExchangeRates(params: { base: string; date: string; target?: string }) {
    let token = this.requireToken('exchangeRatesToken', 'Exchange Rates');
    let axios = makeAxios('https://exchange-rates.abstractapi.com/v1/');
    let queryParams: Record<string, string> = {
      api_key: token,
      base: params.base,
      date: params.date
    };
    if (params.target) queryParams.target = params.target;
    let response = await axios.get('historical', { params: queryParams });
    return response.data;
  }

  async convertCurrency(params: {
    base: string;
    target: string;
    baseAmount?: number;
    date?: string;
  }) {
    let token = this.requireToken('exchangeRatesToken', 'Exchange Rates');
    let axios = makeAxios('https://exchange-rates.abstractapi.com/v1/');
    let queryParams: Record<string, string> = {
      api_key: token,
      base: params.base,
      target: params.target
    };
    if (params.baseAmount !== undefined) queryParams.base_amount = String(params.baseAmount);
    if (params.date) queryParams.date = params.date;
    let response = await axios.get('convert', { params: queryParams });
    return response.data;
  }

  async getHolidays(params: { country: string; year?: number; month?: number; day?: number }) {
    let token = this.requireToken('holidaysToken', 'Public Holidays');
    let axios = makeAxios('https://holidays.abstractapi.com/v1/');
    let queryParams: Record<string, string> = {
      api_key: token,
      country: params.country
    };
    if (params.year !== undefined) queryParams.year = String(params.year);
    if (params.month !== undefined) queryParams.month = String(params.month);
    if (params.day !== undefined) queryParams.day = String(params.day);
    let response = await axios.get('', { params: queryParams });
    return response.data;
  }

  async getCurrentTime(params: { location: string }) {
    let token = this.requireToken('timezoneToken', 'Timezone');
    let axios = makeAxios('https://timezone.abstractapi.com/v1/');
    let response = await axios.get('current_time', {
      params: {
        api_key: token,
        location: params.location
      }
    });
    return response.data;
  }

  async convertTimezone(params: {
    baseLocation: string;
    baseDatetime: string;
    targetLocation: string;
  }) {
    let token = this.requireToken('timezoneToken', 'Timezone');
    let axios = makeAxios('https://timezone.abstractapi.com/v1/');
    let response = await axios.get('convert_time', {
      params: {
        api_key: token,
        base_location: params.baseLocation,
        base_datetime: params.baseDatetime,
        target_location: params.targetLocation
      }
    });
    return response.data;
  }

  async scrapeWebsite(params: {
    url: string;
    renderJs?: boolean;
    proxyCountry?: string;
    premiumProxy?: boolean;
  }) {
    let token = this.requireToken('webScrapingToken', 'Web Scraping');
    let axios = makeAxios('https://scrape.abstractapi.com/v1/');
    let queryParams: Record<string, string> = {
      api_key: token,
      url: params.url
    };
    if (params.renderJs !== undefined) queryParams.render_js = String(params.renderJs);
    if (params.proxyCountry) queryParams.proxy_country = params.proxyCountry;
    if (params.premiumProxy !== undefined)
      queryParams.premium_proxy = String(params.premiumProxy);
    let response = await axios.get('', { params: queryParams });
    return response.data;
  }

  async captureScreenshot(params: {
    url: string;
    captureFullPage?: boolean;
    delay?: number;
    width?: number;
    height?: number;
    cssInjection?: string;
  }) {
    let token = this.requireToken('screenshotToken', 'Website Screenshot');
    let axios = makeAxios('https://screenshot.abstractapi.com/v1/');
    let queryParams: Record<string, string> = {
      api_key: token,
      url: params.url
    };
    if (params.captureFullPage !== undefined)
      queryParams.capture_full_page = String(params.captureFullPage);
    if (params.delay !== undefined) queryParams.delay = String(params.delay);
    if (params.width !== undefined) queryParams.width = String(params.width);
    if (params.height !== undefined) queryParams.height = String(params.height);
    if (params.cssInjection) queryParams.css_injection = params.cssInjection;
    let response = await axios.get('', { params: queryParams });
    return response.data;
  }

  async validateVat(params: { vatNumber: string }) {
    let token = this.requireToken('vatToken', 'VAT Validation');
    let axios = makeAxios('https://vat.abstractapi.com/v1/');
    let response = await axios.get('validate', {
      params: {
        api_key: token,
        vat_number: params.vatNumber
      }
    });
    return response.data;
  }

  async calculateVat(params: {
    amount: number;
    countryCode: string;
    isVatIncl?: boolean;
    vatCategory?: string;
  }) {
    let token = this.requireToken('vatToken', 'VAT Validation');
    let axios = makeAxios('https://vat.abstractapi.com/v1/');
    let queryParams: Record<string, string> = {
      api_key: token,
      amount: String(params.amount),
      country_code: params.countryCode
    };
    if (params.isVatIncl !== undefined) queryParams.is_vat_incl = String(params.isVatIncl);
    if (params.vatCategory) queryParams.vat_category = params.vatCategory;
    let response = await axios.get('calculate', { params: queryParams });
    return response.data;
  }

  async getVatRates(params: { countryCode: string }) {
    let token = this.requireToken('vatToken', 'VAT Validation');
    let axios = makeAxios('https://vat.abstractapi.com/v1/');
    let response = await axios.get('categories', {
      params: {
        api_key: token,
        country_code: params.countryCode
      }
    });
    return response.data;
  }

  async validateIban(params: { ibanNumber: string }) {
    let token = this.requireToken('ibanToken', 'IBAN Validation');
    let axios = makeAxios('https://ibanvalidation.abstractapi.com/v1/');
    let response = await axios.get('', {
      params: {
        api_key: token,
        iban_number: params.ibanNumber
      }
    });
    return response.data;
  }

  async processImage(params: { url: string; lossy?: boolean; quality?: number }) {
    let token = this.requireToken('imageProcessingToken', 'Image Processing');
    let axios = makeAxios('https://images.abstractapi.com/v1/');
    let queryParams: Record<string, string> = {
      api_key: token,
      url: params.url
    };
    if (params.lossy !== undefined) queryParams.lossy = String(params.lossy);
    if (params.quality !== undefined) queryParams.quality = String(params.quality);
    let response = await axios.get('', { params: queryParams });
    return response.data;
  }

  async generateAvatar(params: {
    name: string;
    imageSize?: number;
    fontSize?: number;
    charLimit?: number;
    background?: string;
    fontColor?: string;
  }) {
    let token = this.requireToken('avatarsToken', 'User Avatars');
    let axios = makeAxios('https://avatars.abstractapi.com/v1/');
    let queryParams: Record<string, string> = {
      api_key: token,
      name: params.name
    };
    if (params.imageSize !== undefined) queryParams.image_size = String(params.imageSize);
    if (params.fontSize !== undefined) queryParams.font_size = String(params.fontSize);
    if (params.charLimit !== undefined) queryParams.char_limit = String(params.charLimit);
    if (params.background) queryParams.background = params.background;
    if (params.fontColor) queryParams.font_color = params.fontColor;
    let response = await axios.get('', { params: queryParams });
    return response.data;
  }
}
