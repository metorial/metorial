import { createAxios } from 'slates';
import type {
  AnnotateImageRequest,
  AnnotateImageResponse,
  AuthMethod,
  Feature,
  ImageContext,
  ImageSource
} from './types';

let BASE_URL = 'https://vision.googleapis.com/v1';

export class VisionClient {
  private token: string;
  private authMethod: AuthMethod;

  constructor(config: { token: string; authMethod: AuthMethod }) {
    this.token = config.token;
    this.authMethod = config.authMethod;
  }

  private createAxiosInstance() {
    if (this.authMethod === 'api_key') {
      return createAxios({
        baseURL: BASE_URL,
        params: { key: this.token },
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  buildImagePayload(source: ImageSource): AnnotateImageRequest['image'] {
    if (source.base64Content) {
      return { content: source.base64Content };
    }
    if (source.gcsUri) {
      return { source: { gcsImageUri: source.gcsUri } };
    }
    if (source.imageUrl) {
      return { source: { imageUri: source.imageUrl } };
    }
    throw new Error('One of base64Content, gcsUri, or imageUrl must be provided');
  }

  async annotateImage(
    imageSource: ImageSource,
    features: Feature[],
    imageContext?: ImageContext
  ): Promise<AnnotateImageResponse> {
    let axios = this.createAxiosInstance();
    let request: AnnotateImageRequest = {
      image: this.buildImagePayload(imageSource),
      features,
      ...(imageContext ? { imageContext } : {})
    };

    let response = await axios.post('/images:annotate', {
      requests: [request]
    });

    let result = response.data.responses?.[0] as AnnotateImageResponse | undefined;

    if (!result) {
      throw new Error('No response received from Vision API');
    }

    if (result.error) {
      throw new Error(`Vision API error (${result.error.code}): ${result.error.message}`);
    }

    return result;
  }

  async batchAnnotateImages(
    requests: Array<{
      imageSource: ImageSource;
      features: Feature[];
      imageContext?: ImageContext;
    }>
  ): Promise<AnnotateImageResponse[]> {
    let axios = this.createAxiosInstance();

    let annotateRequests: AnnotateImageRequest[] = requests.map(req => ({
      image: this.buildImagePayload(req.imageSource),
      features: req.features,
      ...(req.imageContext ? { imageContext: req.imageContext } : {})
    }));

    let response = await axios.post('/images:annotate', {
      requests: annotateRequests
    });

    let results = response.data.responses as AnnotateImageResponse[];

    if (!results || results.length === 0) {
      throw new Error('No responses received from Vision API');
    }

    return results;
  }

  async asyncBatchAnnotate(
    requests: Array<{
      imageSource: ImageSource;
      features: Feature[];
      imageContext?: ImageContext;
    }>,
    outputGcsUri: string
  ): Promise<{ operationName: string }> {
    let axios = this.createAxiosInstance();

    let annotateRequests: AnnotateImageRequest[] = requests.map(req => ({
      image: this.buildImagePayload(req.imageSource),
      features: req.features,
      ...(req.imageContext ? { imageContext: req.imageContext } : {})
    }));

    let response = await axios.post('/images:asyncBatchAnnotate', {
      requests: annotateRequests,
      outputConfig: {
        gcsDestination: {
          uri: outputGcsUri
        }
      }
    });

    return {
      operationName: response.data.name
    };
  }
}
