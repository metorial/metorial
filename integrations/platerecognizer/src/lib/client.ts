import { createAxios } from 'slates';

let snapshotAxios = createAxios({
  baseURL: 'https://api.platerecognizer.com/v1'
});

let blurAxios = createAxios({
  baseURL: 'https://blur.platerecognizer.com/v1'
});

let usdotAxios = createAxios({
  baseURL: 'https://usdot-api.parkpow.com/api/v1'
});

let containerAxios = createAxios({
  baseURL: 'https://container-api.parkpow.com/api/v1'
});

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
}

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
      formData.append('upload', options.imageBase64);
    }

    if (options.cameraId) {
      formData.append('camera_id', options.cameraId);
    }

    if (options.timestamp) {
      formData.append('timestamp', options.timestamp);
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
      formData.append('upload', options.imageBase64);
    }

    if (options.cameraId) {
      formData.append('camera_id', options.cameraId);
    }

    if (options.timestamp) {
      formData.append('timestamp', options.timestamp);
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
}
