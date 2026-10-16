import { buildApiServiceError, createAuthenticatedAxios } from 'slates';
import { type CharacterGrid, parseCharacterGrid } from './client';

export interface VbmlComponent {
  template?: string;
  rawCharacters?: CharacterGrid;
  style?: {
    height?: number;
    width?: number;
    justify?: 'left' | 'right' | 'center' | 'justified';
    align?: 'top' | 'bottom' | 'center' | 'justified';
    absolutePosition?: { x: number; y: number };
  };
}

export interface VbmlComposeRequest {
  props?: Record<string, string>;
  style?: {
    height?: number;
    width?: number;
  };
  components: VbmlComponent[];
}

export class VbmlClient {
  private http;

  constructor() {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://cloud.vestaboard.com/vbml',
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Vestaboard VBML',
          reason: 'vestaboard_api_error'
        }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async compose(request: VbmlComposeRequest): Promise<CharacterGrid> {
    let response = await this.http.post('/compose', request);
    return parseCharacterGrid(response.data, 'Vestaboard VBML result');
  }

  async format(message: string, rows?: number, columns?: number): Promise<CharacterGrid> {
    let response = await this.http.post('/format', {
      message,
      ...(rows !== undefined ? { rows } : {}),
      ...(columns !== undefined ? { columns } : {})
    });
    return parseCharacterGrid(response.data, 'Vestaboard VBML result');
  }
}
