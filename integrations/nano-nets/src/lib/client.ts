import { createAxios } from 'slates';
import { nanonetsApiError } from './errors';

type PredictByUrlOptions = {
  asyncMode?: boolean;
  language?: string;
  requestMetadata?: string;
  pagesToProcess?: string;
};

let appendFormValues = (form: URLSearchParams, key: string, values: string[] | undefined) => {
  for (let value of values ?? []) {
    form.append(key, value);
  }
};

let formHeaders = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

export class NanonetsClient {
  private axiosV2: ReturnType<typeof createAxios>;

  constructor(token: string) {
    let authHeader = `Basic ${Buffer.from(`${token}:`).toString('base64')}`;

    this.axiosV2 = createAxios({
      baseURL: 'https://app.nanonets.com/api/v2',
      headers: {
        Authorization: authHeader
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw nanonetsApiError(error, operation);
    }
  }

  // ───────────────────────────────────────────────
  // OCR Model (Workflow) Management
  // ───────────────────────────────────────────────

  async createOcrModel(categories: string[]): Promise<any> {
    return this.request('create OCR model', async () => {
      let response = await this.axiosV2.post('/OCR/Model/', {
        categories,
        model_type: 'ocr'
      });
      return response.data;
    });
  }

  async getOcrModel(modelId: string): Promise<any> {
    return this.request('get OCR model', async () => {
      let response = await this.axiosV2.get(`/OCR/Model/${modelId}`);
      return response.data;
    });
  }

  // ───────────────────────────────────────────────
  // OCR Prediction (Sync & Async)
  // ───────────────────────────────────────────────

  async predictByUrl(
    modelId: string,
    urls: string[],
    options: PredictByUrlOptions = {}
  ): Promise<any> {
    return this.request('predict OCR by URL', async () => {
      let form = new URLSearchParams();
      appendFormValues(form, 'urls', urls);

      if (options.requestMetadata) {
        form.append('request_metadata', options.requestMetadata);
      }
      if (options.pagesToProcess) {
        form.append('pages_to_process', options.pagesToProcess);
      }

      let response = await this.axiosV2.post(
        `/OCR/Model/${modelId}/LabelUrls/`,
        form.toString(),
        {
          headers: formHeaders,
          params: {
            async: options.asyncMode ? true : undefined,
            l: options.language
          }
        }
      );
      return response.data;
    });
  }

  // ───────────────────────────────────────────────
  // Get Prediction Results
  // ───────────────────────────────────────────────

  async getPredictionByFileId(modelId: string, requestFileId: string): Promise<any> {
    return this.request('get prediction by file ID', async () => {
      let response = await this.axiosV2.get(
        `/Inferences/Model/${modelId}/InferenceRequestFiles/GetPredictions/${requestFileId}`
      );
      return response.data;
    });
  }

  async getPredictionsByPage(modelId: string, pageId: string): Promise<any> {
    return this.request('get prediction by page ID', async () => {
      let response = await this.axiosV2.get(
        `/Inferences/Model/${modelId}/ImageLevelInferences/${pageId}`
      );
      return response.data;
    });
  }

  async getAllPredictions(
    modelId: string,
    startDayInterval: number,
    currentBatchDay: number
  ): Promise<any> {
    return this.request('list prediction files', async () => {
      let response = await this.axiosV2.get(
        `/Inferences/Model/${modelId}/ImageLevelInferences`,
        {
          params: {
            start_day_interval: startDayInterval,
            current_batch_day: currentBatchDay
          }
        }
      );
      return response.data;
    });
  }

  // ───────────────────────────────────────────────
  // Full Text OCR
  // ───────────────────────────────────────────────

  async fullTextOcrByUrl(urls: string[]): Promise<any> {
    return this.request('extract full text by URL', async () => {
      let formData = new FormData();
      for (let url of urls) {
        formData.append('urls', url);
      }
      let response = await this.axiosV2.post('/OCR/FullText', formData);
      return response.data;
    });
  }

  // ───────────────────────────────────────────────
  // Training
  // ───────────────────────────────────────────────

  async uploadTrainingUrls(
    modelId: string,
    urls: string[],
    annotations?: string
  ): Promise<any> {
    return this.request('upload OCR training URLs', async () => {
      let body: Record<string, any> = { urls };
      if (annotations) {
        body.data = annotations;
      }
      let response = await this.axiosV2.post(`/OCR/Model/${modelId}/UploadUrls/`, body);
      return response.data;
    });
  }

  async trainModel(modelId: string): Promise<any> {
    return this.request('train OCR model', async () => {
      let response = await this.axiosV2.post(`/OCR/Model/${modelId}/Train/`);
      return response.data;
    });
  }

  // ───────────────────────────────────────────────
  // File Review / Approval
  // ───────────────────────────────────────────────

  async approveFile(modelId: string, requestFileId: string): Promise<any> {
    return this.request('approve file', async () => {
      let response = await this.axiosV2.post(
        `/Inferences/Model/${modelId}/ImageLevelInferences/Verify/${requestFileId}`
      );
      return response.data;
    });
  }

  async unapproveFile(modelId: string, requestFileId: string): Promise<any> {
    return this.request('unapprove file', async () => {
      let response = await this.axiosV2.post(
        `/Inferences/Model/${modelId}/ImageLevelInferences/UnVerify/${requestFileId}`
      );
      return response.data;
    });
  }

  async assignFiles(modelId: string, fileIds: string[], memberEmail: string): Promise<any> {
    return this.request('assign files', async () => {
      let response = await this.axiosV2.post(`/team/members/model/${modelId}/assign/files`, {
        member: memberEmail,
        file_ids: fileIds
      });
      return response.data;
    });
  }

  async updateFileFields(
    modelId: string,
    moderatedBoxes: Record<string, unknown>[],
    useUiVersion = true
  ): Promise<any> {
    return this.request('update file fields', async () => {
      let response = await this.axiosV2.patch(
        `/Inferences/Model/${modelId}/ImageLevelInference`,
        {
          moderated_boxes: moderatedBoxes
        },
        {
          params: {
            use_ui_version: useUiVersion
          }
        }
      );
      return response.data;
    });
  }

  async deleteFile(modelId: string, fileId: string): Promise<any> {
    return this.request('delete file', async () => {
      let response = await this.axiosV2.delete(
        `/Inferences/Model/${modelId}/InferenceRequestFiles/${fileId}`
      );
      return response.data;
    });
  }

  async retryExports(modelId: string, fileIds: string[]): Promise<any> {
    return this.request('retry exports', async () => {
      let response = await this.axiosV2.post(
        `/Inferences/Model/${modelId}/ImageLevelInferences/retryallexports`,
        { file_ids: fileIds }
      );
      return response.data;
    });
  }

  async retryPrediction(modelId: string, fileIds: string[]): Promise<any> {
    return this.request('retry prediction', async () => {
      let response = await this.axiosV2.post(
        `/ObjectDetection/Model/${modelId}/RetryPrediction`,
        { file_ids: fileIds }
      );
      return response.data;
    });
  }

  // ───────────────────────────────────────────────
  // Image Classification
  // ───────────────────────────────────────────────

  async createClassificationModel(categories: string[]): Promise<any> {
    return this.request('create classification model', async () => {
      let formData = new FormData();
      for (let category of categories) {
        formData.append('categories', category);
      }
      let response = await this.axiosV2.post('/ImageCategorization/Model/', formData);
      return response.data;
    });
  }

  async getClassificationModel(modelId: string): Promise<any> {
    return this.request('get classification model', async () => {
      let response = await this.axiosV2.get('/ImageCategorization/Model/', {
        params: { modelId }
      });
      return response.data;
    });
  }

  async classifyByUrl(modelId: string, urls: string[]): Promise<any> {
    return this.request('classify images by URL', async () => {
      let form = new URLSearchParams();
      form.append('modelId', modelId);
      appendFormValues(form, 'urls', urls);

      let response = await this.axiosV2.post(
        '/ImageCategorization/LabelUrls/',
        form.toString(),
        {
          headers: formHeaders
        }
      );
      return response.data;
    });
  }

  async trainClassificationModel(modelId: string): Promise<any> {
    return this.request('train classification model', async () => {
      let response = await this.axiosV2.post('/ImageCategorization/Train/', null, {
        params: { modelId }
      });
      return response.data;
    });
  }

  async uploadClassificationTrainingUrls(
    modelId: string,
    category: string,
    urls: string[]
  ): Promise<any> {
    return this.request('upload classification training URLs', async () => {
      let formData = new FormData();
      formData.append('modelId', modelId);
      formData.append('category', category);
      for (let url of urls) {
        formData.append('urls', url);
      }
      let response = await this.axiosV2.post('/ImageCategorization/UploadUrls', formData);
      return response.data;
    });
  }

  // ───────────────────────────────────────────────
  // Object Detection
  // ───────────────────────────────────────────────

  async createObjectDetectionModel(categories: string[]): Promise<any> {
    return this.request('create object detection model', async () => {
      let response = await this.axiosV2.post('/ObjectDetection/Model/', {
        categories
      });
      return response.data;
    });
  }

  async detectObjectsByUrl(modelId: string, urls: string[]): Promise<any> {
    return this.request('detect objects by URL', async () => {
      let formData = new FormData();
      formData.append('modelId', modelId);
      for (let url of urls) {
        formData.append('urls', url);
      }
      let response = await this.axiosV2.post(
        `/ObjectDetection/Model/${modelId}/LabelUrls/`,
        formData
      );
      return response.data;
    });
  }

  async trainObjectDetectionModel(modelId: string): Promise<any> {
    return this.request('train object detection model', async () => {
      let response = await this.axiosV2.post(`/ObjectDetection/Model/${modelId}/Train/`);
      return response.data;
    });
  }

  async uploadObjectDetectionTrainingUrls(
    modelId: string,
    urls: string[],
    annotations: string
  ): Promise<any> {
    return this.request('upload object detection training URLs', async () => {
      let body = { urls, data: annotations };
      let response = await this.axiosV2.post(
        `/ObjectDetection/Model/${modelId}/UploadUrls/`,
        body
      );
      return response.data;
    });
  }
}
