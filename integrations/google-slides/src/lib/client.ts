import { createAxios } from 'slates';

let BASE_URL = 'https://slides.googleapis.com/v1';

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
