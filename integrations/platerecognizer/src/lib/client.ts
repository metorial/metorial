import { buildApiServiceError, createAxios } from 'slates';

let createProviderAxios = (baseURL: string) => {
  let client = createAxios({ baseURL });
  client.interceptors.response.use(
    response => response,
    error =>
      Promise.reject(
        buildApiServiceError(error, {
          providerLabel: 'Plate Recognizer',
          reason: 'Plate Recognizer request failed',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          nestedKeys: ['errors', 'detail', 'error', 'upload', 'upload_url', 'image', 'type']
        })
      )
  );
  return client;
};

let snapshotAxios = createProviderAxios('https://api.platerecognizer.com/v1');

let blurAxios = createProviderAxios('https://blur.platerecognizer.com/v1');

let usdotAxios = createProviderAxios('https://usdot.parkpow.com/api/v1');

let containerAxios = createProviderAxios('https://container-api.parkpow.com/api/v1');

export interface PlateReaderOptions {
  imageUrl?: string;
  imageBase64?: string;
  regions?: string[];
  cameraId?: string;
  timestamp?: string;
  mmc?: boolean;
  direction?: boolean;
  config?: Record<string, unknown>;
}

export interface BlurOptions {
  imageUrl?: string;
  imageBase64?: string;
  plates?: number;
  faces?: number;
  regions?: string[];
  cameraId?: string;
}

export interface ReaderOptions {
  imageUrl?: string;
  imageBase64?: string;
  cameraId?: string;
  timestamp?: string;
  minDetectionScore?: number;
  minOcrScore?: number;
  imageMimeType?: string;
  imageFilename?: string;
}

let appendBinaryImage = (formData: FormData, options: ReaderOptions) => {
  if (!options.imageBase64) return;
  let dataUri = /^data:([^;,]+);base64,([\s\S]*)$/.exec(options.imageBase64);
  let content = Buffer.from(dataUri?.[2] ?? options.imageBase64, 'base64');
  let image = new Blob([content], { type: options.imageMimeType ?? dataUri?.[1] });
  if (options.imageFilename !== undefined) {
    formData.append('image', image, options.imageFilename);
  } else {
    formData.append('image', image);
  }
};

export type OcrType =
  | 'vin'
  | 'trailer_id'
  | 'odometer'
  | 'shipping_container'
  | 'boat_reg_number';

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private authHeaders() {
    return { Authorization: `Token ${this.token}` };
  }

  async recognizePlate(options: PlateReaderOptions) {
    let formData = new FormData();

    if (options.imageUrl) {
      formData.append('upload_url', options.imageUrl);
    } else if (options.imageBase64) {
      formData.append('upload', options.imageBase64);
    }

    if (options.regions && options.regions.length > 0) {
      for (let region of options.regions) {
        formData.append('regions', region);
      }
    }

    if (options.cameraId) {
      formData.append('camera_id', options.cameraId);
    }

    if (options.timestamp) {
      formData.append('timestamp', options.timestamp);
    }

    if (options.mmc) {
      formData.append('mmc', 'true');
    }

    if (options.direction) {
      formData.append('direction', 'true');
    }

    if (options.config) {
      formData.append('config', JSON.stringify(options.config));
    }

    let response = await snapshotAxios.post('/plate-reader/', formData, {
      headers: this.authHeaders()
    });

    return response.data;
  }

  async blurImage(options: BlurOptions) {
    let formData = new FormData();

    if (options.imageUrl) {
      formData.append('upload_url', options.imageUrl);
    } else if (options.imageBase64) {
      formData.append('upload', options.imageBase64);
    }

    if (options.plates !== undefined) {
      formData.append('plates', String(options.plates));
    }

    if (options.faces !== undefined) {
      formData.append('faces', String(options.faces));
    }

    if (options.regions && options.regions.length > 0) {
      for (let region of options.regions) {
        formData.append('regions', region);
      }
    }

    if (options.cameraId) {
      formData.append('camera_id', options.cameraId);
    }

    let response = await blurAxios.post('/blur', formData, {
      headers: this.authHeaders()
    });

    return response.data;
  }

  async recognizeVin(options: ReaderOptions) {
    let formData = new FormData();

    if (options.imageUrl) {
      formData.append('upload_url', options.imageUrl);
    } else if (options.imageBase64) {
      formData.append('upload', options.imageBase64);
    }

    if (options.cameraId) {
      formData.append('camera_id', options.cameraId);
    }

    if (options.timestamp) {
      formData.append('timestamp', options.timestamp);
    }

    let response = await snapshotAxios.post('/vin/reader/', formData, {
      headers: this.authHeaders()
    });

    return response.data;
  }

  async recognizeTrailer(options: ReaderOptions) {
    let formData = new FormData();

    if (options.imageUrl) {
      formData.append('upload_url', options.imageUrl);
    } else if (options.imageBase64) {
      formData.append('upload', options.imageBase64);
    }

    if (options.cameraId) {
      formData.append('camera_id', options.cameraId);
    }

    if (options.timestamp) {
      formData.append('timestamp', options.timestamp);
    }

    let response = await snapshotAxios.post('/trailerid/reader/', formData, {
      headers: this.authHeaders()
    });

    return response.data;
  }

  async recognizeUsdot(options: ReaderOptions) {
    let formData = new FormData();

    if (options.imageUrl) {
      formData.append('upload_url', options.imageUrl);
    } else if (options.imageBase64) {
      appendBinaryImage(formData, options);
    }

    if (options.cameraId) {
      formData.append('camera_id', options.cameraId);
    }

    if (options.timestamp) {
      formData.append('timestamp', options.timestamp);
    }

    if (options.minDetectionScore !== undefined) {
      formData.append('min_detection_score', String(options.minDetectionScore));
    }
    if (options.minOcrScore !== undefined) {
      formData.append('min_ocr_score', String(options.minOcrScore));
    }

    let response = await usdotAxios.post('/predict/', formData, {
      headers: this.authHeaders()
    });

    return response.data;
  }

  async recognizeContainer(options: ReaderOptions) {
    let formData = new FormData();

    if (options.imageUrl) {
      formData.append('upload_url', options.imageUrl);
    } else if (options.imageBase64) {
      appendBinaryImage(formData, options);
    }

    if (options.cameraId) {
      formData.append('camera_id', options.cameraId);
    }

    if (options.timestamp) {
      formData.append('timestamp', options.timestamp);
    }

    if (options.minDetectionScore !== undefined) {
      formData.append('min_detection_score', String(options.minDetectionScore));
    }
    if (options.minOcrScore !== undefined) {
      formData.append('min_ocr_score', String(options.minOcrScore));
    }

    let response = await containerAxios.post('/predict/', formData, {
      headers: this.authHeaders()
    });

    return response.data;
  }

  async recognizeBoat(options: ReaderOptions) {
    let formData = new FormData();

    if (options.imageUrl) {
      formData.append('upload_url', options.imageUrl);
    } else if (options.imageBase64) {
      formData.append('upload', options.imageBase64);
    }

    if (options.cameraId) {
      formData.append('camera_id', options.cameraId);
    }

    if (options.timestamp) {
      formData.append('timestamp', options.timestamp);
    }

    let response = await snapshotAxios.post('/boatid/reader/', formData, {
      headers: this.authHeaders()
    });

    return response.data;
  }

  async getSnapshotStatistics() {
    let response = await snapshotAxios.get('/statistics/', {
      headers: this.authHeaders()
    });
    return response.data;
  }

  async getVinStatistics() {
    let response = await snapshotAxios.get('/vin/statistics/', {
      headers: this.authHeaders()
    });
    return response.data;
  }

  async getTrailerStatistics() {
    let response = await snapshotAxios.get('/trailerid/statistics/', {
      headers: this.authHeaders()
    });
    return response.data;
  }

  async recognizeText(options: ReaderOptions & { type: OcrType }) {
    let formData = new FormData();
    if (options.imageUrl) {
      formData.append('upload_url', options.imageUrl);
    } else if (options.imageBase64) {
      formData.append('upload', options.imageBase64);
    }
    if (options.cameraId) formData.append('camera_id', options.cameraId);
    if (options.timestamp) formData.append('timestamp', options.timestamp);
    formData.append('type', options.type);
    let response = await snapshotAxios.post('/ocr/reader/', formData, {
      headers: this.authHeaders()
    });
    return response.data;
  }

  async getOcrStatistics() {
    let response = await snapshotAxios.get('/ocr/statistics/', {
      headers: this.authHeaders()
    });
    return response.data;
  }

  async listLicenses(
    productType: string,
    params: Record<string, string | number | boolean | undefined>
  ) {
    let response = await snapshotAxios.get(`/licenses/${encodeURIComponent(productType)}/`, {
      headers: this.authHeaders(),
      params
    });
    return response.data;
  }
}
