import { createAxios } from 'slates';

let BASE_URL = 'https://addressvalidation.googleapis.com/v1';

export interface PostalAddress {
  revision?: number;
  regionCode?: string;
  languageCode?: string;
  postalCode?: string;
  sortingCode?: string;
  administrativeArea?: string;
  locality?: string;
  sublocality?: string;
  addressLines?: string[];
  recipients?: string[];
  organization?: string;
}

export interface ValidateAddressRequest {
  address: PostalAddress;
  previousResponseId?: string;
  enableUspsCass?: boolean;
  languageOptions?: {
    returnEnglishLatinAddress?: boolean;
  };
  sessionToken?: string;
}

export interface ComponentName {
  text: string;
  languageCode?: string;
}

export interface AddressComponent {
  componentName: ComponentName;
  componentType: string;
  confirmationLevel: string;
  inferred?: boolean;
  spellCorrected?: boolean;
  replaced?: boolean;
  unexpected?: boolean;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface PlusCode {
  globalCode: string;
  compoundCode?: string;
}

export interface Geocode {
  location: LatLng;
  plusCode?: PlusCode;
  bounds?: {
    low: LatLng;
    high: LatLng;
  };
  featureSizeMeters?: number;
  placeId?: string;
  placeTypes?: string[];
}

export interface AddressMetadata {
  business?: boolean;
  poBox?: boolean;
  residential?: boolean;
}

export interface UspsStandardizedAddress {
  firstAddressLine?: string;
  firm?: string;
  secondAddressLine?: string;
  urbanization?: string;
  cityStateZipAddressLine?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  zipCodeExtension?: string;
}

export interface UspsData {
  standardizedAddress?: UspsStandardizedAddress;
  deliveryPointCode?: string;
  deliveryPointCheckDigit?: string;
  dpvConfirmation?: string;
  dpvFootnote?: string;
  dpvCmra?: string;
  dpvVacant?: string;
  dpvNoStat?: string;
  dpvNoStatReasonCode?: number;
  dpvDrop?: string;
  dpvThrowback?: string;
  dpvNonDeliveryDays?: string;
  dpvNonDeliveryDaysValues?: number;
  dpvNoSecureLocation?: string;
  dpvPbsa?: string;
  dpvDoorNotAccessible?: string;
  dpvEnhancedDeliveryCode?: string;
  carrierRoute?: string;
  carrierRouteIndicator?: string;
  ewsNoMatch?: boolean;
  postOfficeCity?: string;
  postOfficeState?: string;
  abbreviatedCity?: string;
  fipsCountyCode?: string;
  county?: string;
  elotNumber?: string;
  elotFlag?: string;
  lacsLinkReturnCode?: string;
  lacsLinkIndicator?: string;
  poBoxOnlyPostalCode?: boolean;
  suitelinkFootnote?: string;
  pmbDesignator?: string;
  pmbNumber?: string;
  addressRecordType?: string;
  defaultAddress?: boolean;
  errorMessage?: string;
  cassProcessed?: boolean;
}

export interface Verdict {
  inputGranularity?: string;
  validationGranularity?: string;
  geocodeGranularity?: string;
  addressComplete?: boolean;
  hasUnconfirmedComponents?: boolean;
  hasInferredComponents?: boolean;
  hasReplacedComponents?: boolean;
  hasSpellCorrectedComponents?: boolean;
  possibleNextAction?: string;
}

export interface ValidatedAddress {
  formattedAddress?: string;
  postalAddress?: PostalAddress;
  addressComponents?: AddressComponent[];
  missingComponentTypes?: string[];
  unconfirmedComponentTypes?: string[];
  unresolvedTokens?: string[];
}

export interface ValidationResult {
  verdict: Verdict;
  address: ValidatedAddress;
  geocode?: Geocode;
  metadata?: AddressMetadata;
  uspsData?: UspsData;
  englishLatinAddress?: ValidatedAddress;
}

export interface ValidateAddressResponse {
  result: ValidationResult;
  responseId: string;
}

export interface ProvideValidationFeedbackRequest {
  conclusion: string;
  responseId: string;
}

export class Client {
  private token: string;
  private authMethod: 'api_key' | 'oauth';

  constructor(config: { token: string; authMethod?: 'api_key' | 'oauth' }) {
    this.token = config.token;
    this.authMethod = config.authMethod ?? 'api_key';
  }

  private createAxiosInstance() {
    if (this.authMethod === 'oauth') {
      return createAxios({
        baseURL: BASE_URL,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
    }

    return createAxios({
      baseURL: BASE_URL,
      params: {
        key: this.token
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async validateAddress(request: ValidateAddressRequest): Promise<ValidateAddressResponse> {
    let axiosInstance = this.createAxiosInstance();
    let response = await axiosInstance.post(':validateAddress', request);
    return response.data;
  }

  async provideValidationFeedback(request: ProvideValidationFeedbackRequest): Promise<void> {
    let axiosInstance = this.createAxiosInstance();
    await axiosInstance.post(':provideValidationFeedback', request);
  }
}
