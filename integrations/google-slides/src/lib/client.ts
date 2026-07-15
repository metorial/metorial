import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getResponseHeaderValue
} from 'slates';

let BASE_URL = 'https://slides.googleapis.com/v1';
let PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type SlideThumbnailSize = 'LARGE' | 'MEDIUM' | 'SMALL';

export interface SlideThumbnailDownload {
  width: number;
  height: number;
  mimeType: 'image/png';
  content: Buffer;
}

export class SlidesClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  async createPresentation(title: string): Promise<any> {
    let response = await this.http.post('/presentations', { title });
    return response.data;
  }

  async getPresentation(presentationId: string): Promise<any> {
    let response = await this.http.get(`/presentations/${presentationId}`);
    return response.data;
  }

  async getPage(presentationId: string, pageObjectId: string): Promise<any> {
    let response = await this.http.get(
      `/presentations/${presentationId}/pages/${pageObjectId}`
    );
    return response.data;
  }

  async getPageThumbnail(
    presentationId: string,
    pageObjectId: string,
    thumbnailSize?: SlideThumbnailSize
  ): Promise<SlideThumbnailDownload> {
    let params: Record<string, string> = {
      'thumbnailProperties.mimeType': 'PNG'
    };
    if (thumbnailSize !== undefined) {
      params['thumbnailProperties.thumbnailSize'] = thumbnailSize;
    }

    let thumbnailResponse: any;
    try {
      thumbnailResponse = await this.http.get(
        `/presentations/${encodeURIComponent(presentationId)}/pages/${encodeURIComponent(pageObjectId)}/thumbnail`,
        { params }
      );
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Slides',
        operation: 'generate slide thumbnail',
        reason: 'google_slides_thumbnail_api_error',
        nestedKeys: ['error', 'errors']
      });
    }

    let { contentUrl, width, height } = thumbnailResponse.data ?? {};
    if (
      typeof contentUrl !== 'string' ||
      contentUrl.length === 0 ||
      !Number.isInteger(width) ||
      width <= 0 ||
      !Number.isInteger(height) ||
      height <= 0
    ) {
      throw createApiServiceError(
        'Google Slides returned incomplete thumbnail metadata. Retry the request.',
        { reason: 'google_slides_thumbnail_metadata_invalid' }
      );
    }

    let parsedContentUrl: URL;
    try {
      parsedContentUrl = new URL(contentUrl);
    } catch {
      throw createApiServiceError(
        'Google Slides returned an invalid thumbnail content URL. Retry the request.',
        { reason: 'google_slides_thumbnail_content_url_invalid' }
      );
    }
    if (parsedContentUrl.protocol !== 'https:') {
      throw createApiServiceError(
        'Google Slides returned a non-HTTPS thumbnail content URL, so the image was not downloaded.',
        { reason: 'google_slides_thumbnail_content_url_invalid' }
      );
    }

    let downloadResponse: any;
    try {
      // Google documents this requester-tagged URL as directly accessible to anyone who
      // has it. Fetch it without OAuth so a bearer token can never leak to the URL host.
      let downloadHttp = createAxios();
      downloadResponse = await downloadHttp.get(parsedContentUrl.toString(), {
        responseType: 'arraybuffer'
      });
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Slides',
        operation: 'download generated slide thumbnail',
        reason: 'google_slides_thumbnail_download_error',
        nestedKeys: ['error', 'errors']
      });
    }

    let downloadedData = downloadResponse?.data;
    let content: Buffer;
    if (Buffer.isBuffer(downloadedData)) {
      content = downloadedData;
    } else if (downloadedData instanceof ArrayBuffer) {
      content = Buffer.from(downloadedData);
    } else if (ArrayBuffer.isView(downloadedData)) {
      content = Buffer.from(
        downloadedData.buffer,
        downloadedData.byteOffset,
        downloadedData.byteLength
      );
    } else {
      throw createApiServiceError(
        'Google Slides returned an invalid thumbnail download response.',
        { reason: 'google_slides_thumbnail_content_invalid' }
      );
    }

    let responseMimeType = getResponseHeaderValue(downloadResponse.headers, 'content-type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase();
    if (responseMimeType !== 'image/png') {
      throw createApiServiceError(
        responseMimeType
          ? `Google Slides returned thumbnail content with unexpected MIME type "${responseMimeType}".`
          : 'Google Slides returned thumbnail content without the required image/png MIME type.',
        { reason: 'google_slides_thumbnail_mime_type_invalid' }
      );
    }
    if (
      content.length < PNG_SIGNATURE.length ||
      !content.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
    ) {
      throw createApiServiceError('Google Slides returned invalid PNG thumbnail content.', {
        reason: 'google_slides_thumbnail_content_invalid'
      });
    }

    return {
      width,
      height,
      mimeType: 'image/png',
      content
    };
  }

  async batchUpdate(presentationId: string, requests: any[]): Promise<any> {
    let response = await this.http.post(`/presentations/${presentationId}:batchUpdate`, {
      requests
    });
    return response.data;
  }

  async createSlide(
    presentationId: string,
    options: {
      insertionIndex?: number;
      layoutId?: string;
      predefinedLayout?: string;
      slideObjectId?: string;
      placeholderMappings?: any[];
    }
  ): Promise<any> {
    let slideProperties: any = {};

    if (options.layoutId) {
      slideProperties.layoutObjectId = options.layoutId;
    } else if (options.predefinedLayout) {
      slideProperties.predefinedLayout = options.predefinedLayout;
    }

    let request: any = {
      createSlide: {
        objectId: options.slideObjectId,
        insertionIndex: options.insertionIndex,
        slideLayoutReference:
          Object.keys(slideProperties).length > 0 ? slideProperties : undefined,
        placeholderIdMappings: options.placeholderMappings
      }
    };

    return this.batchUpdate(presentationId, [request]);
  }

  async deleteSlide(presentationId: string, slideObjectId: string): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        deleteObject: {
          objectId: slideObjectId
        }
      }
    ]);
  }

  async duplicateSlide(
    presentationId: string,
    slideObjectId: string,
    newSlideObjectId?: string
  ): Promise<any> {
    let request: any = {
      duplicateObject: {
        objectId: slideObjectId
      }
    };

    if (newSlideObjectId) {
      request.duplicateObject.objectPropertiesForNewObject = {};
    }

    return this.batchUpdate(presentationId, [request]);
  }

  async moveSlide(
    presentationId: string,
    slideObjectIds: string[],
    insertionIndex: number
  ): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        updateSlidesPosition: {
          slideObjectIds,
          insertionIndex
        }
      }
    ]);
  }

  async insertText(
    presentationId: string,
    objectId: string,
    text: string,
    insertionIndex?: number
  ): Promise<any> {
    let request: any = {
      insertText: {
        objectId,
        text,
        insertionIndex: insertionIndex ?? 0
      }
    };

    return this.batchUpdate(presentationId, [request]);
  }

  async deleteText(
    presentationId: string,
    objectId: string,
    startIndex: number,
    endIndex: number,
    type?: string
  ): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        deleteText: {
          objectId,
          textRange: {
            type: type || 'FIXED_RANGE',
            startIndex,
            endIndex
          }
        }
      }
    ]);
  }

  async replaceAllText(
    presentationId: string,
    findText: string,
    replaceText: string,
    matchCase?: boolean
  ): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        replaceAllText: {
          containsText: {
            text: findText,
            matchCase: matchCase ?? false
          },
          replaceText
        }
      }
    ]);
  }

  async updateTextStyle(
    presentationId: string,
    objectId: string,
    style: any,
    textRange: any,
    fields: string
  ): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        updateTextStyle: {
          objectId,
          style,
          textRange,
          fields
        }
      }
    ]);
  }

  async createShape(
    presentationId: string,
    options: {
      shapeType: string;
      pageObjectId: string;
      elementProperties: any;
      shapeObjectId?: string;
    }
  ): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        createShape: {
          objectId: options.shapeObjectId,
          shapeType: options.shapeType,
          elementProperties: {
            pageObjectId: options.pageObjectId,
            ...options.elementProperties
          }
        }
      }
    ]);
  }

  async createImage(
    presentationId: string,
    options: {
      url: string;
      pageObjectId: string;
      size?: { width: number; height: number };
      transform?: any;
      imageObjectId?: string;
    }
  ): Promise<any> {
    let elementProperties: any = {
      pageObjectId: options.pageObjectId
    };

    if (options.size) {
      elementProperties.size = {
        width: { magnitude: options.size.width, unit: 'PT' },
        height: { magnitude: options.size.height, unit: 'PT' }
      };
    }

    if (options.transform) {
      elementProperties.transform = options.transform;
    }

    return this.batchUpdate(presentationId, [
      {
        createImage: {
          objectId: options.imageObjectId,
          url: options.url,
          elementProperties
        }
      }
    ]);
  }

  async replaceAllShapesWithImage(
    presentationId: string,
    findText: string,
    imageUrl: string,
    replaceMethod?: string
  ): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        replaceAllShapesWithImage: {
          containsText: {
            text: findText,
            matchCase: true
          },
          imageUrl,
          imageReplaceMethod: replaceMethod || 'CENTER_INSIDE'
        }
      }
    ]);
  }

  async createSheetsChart(
    presentationId: string,
    options: {
      spreadsheetId: string;
      chartId: number;
      pageObjectId: string;
      size?: { width: number; height: number };
      transform?: any;
      linkingMode?: string;
      chartObjectId?: string;
    }
  ): Promise<any> {
    let elementProperties: any = {
      pageObjectId: options.pageObjectId
    };

    if (options.size) {
      elementProperties.size = {
        width: { magnitude: options.size.width, unit: 'PT' },
        height: { magnitude: options.size.height, unit: 'PT' }
      };
    }

    if (options.transform) {
      elementProperties.transform = options.transform;
    }

    return this.batchUpdate(presentationId, [
      {
        createSheetsChart: {
          objectId: options.chartObjectId,
          spreadsheetId: options.spreadsheetId,
          chartId: options.chartId,
          linkingMode: options.linkingMode || 'LINKED',
          elementProperties
        }
      }
    ]);
  }

  async refreshSheetsChart(presentationId: string, chartObjectId: string): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        refreshSheetsChart: {
          objectId: chartObjectId
        }
      }
    ]);
  }

  async updateSpeakerNotes(
    presentationId: string,
    slideObjectId: string,
    text: string
  ): Promise<any> {
    let page = await this.getPage(presentationId, slideObjectId);
    let notesPage = page.slideProperties?.notesPage;
    let notesId = notesPage?.notesProperties?.speakerNotesObjectId;

    if (!notesId) {
      throw new Error('Speaker notes object not found for this slide.');
    }

    let notesElement = notesPage?.pageElements?.find(
      (element: { objectId?: string }) => element.objectId === notesId
    );
    let existingText =
      notesElement?.shape?.text?.textElements
        ?.map(
          (textElement: { textRun?: { content?: string } }) =>
            textElement.textRun?.content ?? ''
        )
        .join('') ?? '';

    let requests: any[] = [];

    if (existingText.trim().length > 0) {
      requests.push({
        deleteText: {
          objectId: notesId,
          textRange: {
            type: 'ALL'
          }
        }
      });
    }

    requests.push({
      insertText: {
        objectId: notesId,
        text,
        insertionIndex: 0
      }
    });

    return this.batchUpdate(presentationId, requests);
  }

  async updatePageElementTransform(
    presentationId: string,
    objectId: string,
    transform: any,
    applyMode?: string
  ): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        updatePageElementTransform: {
          objectId,
          transform,
          applyMode: applyMode || 'ABSOLUTE'
        }
      }
    ]);
  }

  async deleteObject(presentationId: string, objectId: string): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        deleteObject: {
          objectId
        }
      }
    ]);
  }

  async updateShapeProperties(
    presentationId: string,
    objectId: string,
    shapeProperties: any,
    fields: string
  ): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        updateShapeProperties: {
          objectId,
          shapeProperties,
          fields
        }
      }
    ]);
  }

  async createParagraphBullets(
    presentationId: string,
    objectId: string,
    textRange: any,
    bulletPreset: string
  ): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        createParagraphBullets: {
          objectId,
          textRange,
          bulletPreset
        }
      }
    ]);
  }

  async updateParagraphStyle(
    presentationId: string,
    objectId: string,
    style: any,
    textRange: any,
    fields: string
  ): Promise<any> {
    return this.batchUpdate(presentationId, [
      {
        updateParagraphStyle: {
          objectId,
          style,
          textRange,
          fields
        }
      }
    ]);
  }
}
