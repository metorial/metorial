import { type AdobeAuthConfig, createAdobeAxios } from './client';

let PHOTOSHOP_BASE_URL = 'https://image.adobe.io';

export interface StorageReference {
  href: string;
  storage: 'external' | 'azure' | 'dropbox';
}

export interface PhotoshopJobStatus {
  jobId: string;
  status: string;
  outputs?: any[];
  links?: any;
}

export class PhotoshopClient {
  private http;

  constructor(auth: AdobeAuthConfig) {
    this.http = createAdobeAxios(PHOTOSHOP_BASE_URL, auth);
  }

  async removeBackground(input: StorageReference, output: StorageReference) {
    let response = await this.http.post('/sensei/cutout', {
      input,
      output
    });
    return response.data as PhotoshopJobStatus;
  }

  async autoTone(input: StorageReference, output: StorageReference) {
    let response = await this.http.post('/lrService/autoTone', {
      inputs: input,
      outputs: [output]
    });
    return response.data as PhotoshopJobStatus;
  }

  async autoStraighten(input: StorageReference, output: StorageReference) {
    let response = await this.http.post('/lrService/autoStraighten', {
      inputs: input,
      outputs: [output]
    });
    return response.data as PhotoshopJobStatus;
  }

  async smartCrop(
    input: StorageReference,
    output: StorageReference,
    options?: {
      width?: number;
      height?: number;
    }
  ) {
    let response = await this.http.post('/sensei/smartCrop', {
      input,
      output,
      options: {
        width: options?.width || 100,
        height: options?.height || 100
      }
    });
    return response.data as PhotoshopJobStatus;
  }

  async getDocumentManifest(input: StorageReference) {
    let response = await this.http.post('/pie/psdService/documentManifest', {
      inputs: [input]
    });
    return response.data;
  }

  async applyPsdEdits(
    input: StorageReference,
    outputs: StorageReference[],
    options: {
      layers?: any[];
      globalOptions?: any;
    }
  ) {
    let response = await this.http.post('/pie/psdService/documentOperations', {
      inputs: [input],
      options: {
        layers: options.layers,
        ...(options.globalOptions || {})
      },
      outputs
    });
    return response.data as PhotoshopJobStatus;
  }

  async createRendition(
    input: StorageReference,
    outputs: Array<
      StorageReference & {
        type?: string;
        width?: number;
        quality?: number;
      }
    >
  ) {
    let response = await this.http.post('/pie/psdService/renditionCreate', {
      inputs: [input],
      outputs
    });
    return response.data as PhotoshopJobStatus;
  }

  async replaceSmartObject(
    input: StorageReference,
    output: StorageReference,
    smartObjectLayer: {
      name?: string;
      layerId?: number;
      replacement: StorageReference;
    }
  ) {
    let response = await this.http.post('/pie/psdService/smartObject', {
      inputs: [input],
      options: {
        layers: [
          {
            ...(smartObjectLayer.name ? { name: smartObjectLayer.name } : {}),
            ...(smartObjectLayer.layerId ? { id: smartObjectLayer.layerId } : {}),
            input: smartObjectLayer.replacement,
            edit: {}
          }
        ]
      },
      outputs: [output]
    });
    return response.data as PhotoshopJobStatus;
  }

  async applyActions(input: StorageReference, output: StorageReference, actions: any[]) {
    let response = await this.http.post('/pie/psdService/actionJSON', {
      inputs: [input],
      options: {
        actionJSON: actions
      },
      outputs: [output]
    });
    return response.data as PhotoshopJobStatus;
  }

  async editTextLayers(
    input: StorageReference,
    output: StorageReference,
    layers: Array<{
      name?: string;
      layerId?: number;
      text: {
        content: string;
        characterStyles?: any[];
        paragraphStyles?: any[];
      };
    }>
  ) {
    let response = await this.http.post('/pie/psdService/text', {
      inputs: [input],
      options: {
        layers: layers.map(layer => ({
          ...(layer.name ? { name: layer.name } : {}),
          ...(layer.layerId ? { id: layer.layerId } : {}),
          text: layer.text
        }))
      },
      outputs: [output]
    });
    return response.data as PhotoshopJobStatus;
  }

  async getJobStatus(statusUrl: string) {
    let response = await this.http.get(statusUrl);
    return response.data as PhotoshopJobStatus;
  }
}
