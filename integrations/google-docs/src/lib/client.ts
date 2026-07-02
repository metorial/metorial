import { createAxios } from 'slates';

// Google Docs API types
export interface Document {
  documentId: string;
  title: string;
  body?: DocumentBody;
  headers?: Record<string, Header>;
  footers?: Record<string, Footer>;
  documentStyle?: DocumentStyle;
  namedStyles?: NamedStyles;
  revisionId?: string;
  suggestionsViewMode?: string;
  inlineObjects?: Record<string, InlineObject>;
  namedRanges?: Record<string, NamedRanges>;
}

export interface DocumentBody {
  content?: StructuralElement[];
}

export interface StructuralElement {
  startIndex?: number;
  endIndex?: number;
  paragraph?: Paragraph;
  sectionBreak?: SectionBreak;
  table?: Table;
  tableOfContents?: TableOfContents;
}

export interface Paragraph {
  elements?: ParagraphElement[];
  paragraphStyle?: ParagraphStyle;
  bullet?: Bullet;
}

export interface ParagraphElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: TextRun;
  inlineObjectElement?: InlineObjectElement;
  pageBreak?: PageBreak;
}

export interface TextRun {
  content?: string;
  textStyle?: TextStyle;
}

export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: Dimension;
  foregroundColor?: OptionalColor;
  backgroundColor?: OptionalColor;
  fontFamily?: string;
  link?: Link;
  baselineOffset?: string;
  smallCaps?: boolean;
  weightedFontFamily?: WeightedFontFamily;
}

export interface WeightedFontFamily {
  fontFamily?: string;
  weight?: number;
}

export interface Dimension {
  magnitude?: number;
  unit?: string;
}

export interface OptionalColor {
  color?: Color;
}

export interface Color {
  rgbColor?: RgbColor;
}

export interface RgbColor {
  red?: number;
  green?: number;
  blue?: number;
}

export interface Link {
  url?: string;
  bookmarkId?: string;
  headingId?: string;
}

export interface ParagraphStyle {
  headingId?: string;
  namedStyleType?: string;
  alignment?: string;
  lineSpacing?: number;
  direction?: string;
  spacingMode?: string;
  spaceAbove?: Dimension;
  spaceBelow?: Dimension;
  borderBetween?: ParagraphBorder;
  borderTop?: ParagraphBorder;
  borderBottom?: ParagraphBorder;
  borderLeft?: ParagraphBorder;
  borderRight?: ParagraphBorder;
  indentFirstLine?: Dimension;
  indentStart?: Dimension;
  indentEnd?: Dimension;
  tabStops?: TabStop[];
  keepLinesTogether?: boolean;
  keepWithNext?: boolean;
  avoidWidowAndOrphan?: boolean;
  shading?: Shading;
}

export interface ParagraphBorder {
  color?: OptionalColor;
  width?: Dimension;
  padding?: Dimension;
  dashStyle?: string;
}

export interface TabStop {
  offset?: Dimension;
  alignment?: string;
}

export interface Shading {
  backgroundColor?: OptionalColor;
}

export interface Bullet {
  listId?: string;
  nestingLevel?: number;
  textStyle?: TextStyle;
}

export interface InlineObjectElement {
  inlineObjectId?: string;
  textStyle?: TextStyle;
}

export interface PageBreak {
  textStyle?: TextStyle;
}

export interface SectionBreak {
  sectionStyle?: SectionStyle;
}

export interface SectionStyle {
  columnProperties?: SectionColumnProperties[];
  columnSeparatorStyle?: string;
  contentDirection?: string;
  marginTop?: Dimension;
  marginBottom?: Dimension;
  marginRight?: Dimension;
  marginLeft?: Dimension;
  marginHeader?: Dimension;
  marginFooter?: Dimension;
  sectionType?: string;
  defaultHeaderId?: string;
  defaultFooterId?: string;
  firstPageHeaderId?: string;
  firstPageFooterId?: string;
  evenPageHeaderId?: string;
  evenPageFooterId?: string;
  useFirstPageHeaderFooter?: boolean;
  pageNumberStart?: number;
}

export interface SectionColumnProperties {
  width?: Dimension;
  paddingEnd?: Dimension;
}

export interface Table {
  rows?: number;
  columns?: number;
  tableRows?: TableRow[];
  tableStyle?: TableStyle;
}

export interface TableRow {
  startIndex?: number;
  endIndex?: number;
  tableCells?: TableCell[];
  tableRowStyle?: TableRowStyle;
}

export interface TableCell {
  startIndex?: number;
  endIndex?: number;
  content?: StructuralElement[];
  tableCellStyle?: TableCellStyle;
}

export interface TableCellStyle {
  rowSpan?: number;
  columnSpan?: number;
  backgroundColor?: OptionalColor;
  borderLeft?: TableCellBorder;
  borderRight?: TableCellBorder;
  borderTop?: TableCellBorder;
  borderBottom?: TableCellBorder;
  paddingLeft?: Dimension;
  paddingRight?: Dimension;
  paddingTop?: Dimension;
  paddingBottom?: Dimension;
  contentAlignment?: string;
}

export interface TableCellBorder {
  color?: OptionalColor;
  width?: Dimension;
  dashStyle?: string;
}

export interface TableRowStyle {
  minRowHeight?: Dimension;
}

export interface TableStyle {
  tableColumnProperties?: TableColumnProperties[];
}

export interface TableColumnProperties {
  widthType?: string;
  width?: Dimension;
}

export interface TableOfContents {
  content?: StructuralElement[];
}

export interface Header {
  headerId?: string;
  content?: StructuralElement[];
}

export interface Footer {
  footerId?: string;
  content?: StructuralElement[];
}

export interface DocumentStyle {
  background?: Background;
  defaultHeaderId?: string;
  defaultFooterId?: string;
  evenPageHeaderId?: string;
  evenPageFooterId?: string;
  firstPageHeaderId?: string;
  firstPageFooterId?: string;
  useFirstPageHeaderFooter?: boolean;
  useEvenPageHeaderFooter?: boolean;
  pageNumberStart?: number;
  marginTop?: Dimension;
  marginBottom?: Dimension;
  marginRight?: Dimension;
  marginLeft?: Dimension;
  pageSize?: Size;
  marginHeader?: Dimension;
  marginFooter?: Dimension;
  useCustomHeaderFooterMargins?: boolean;
}

export interface Background {
  color?: OptionalColor;
}

export interface Size {
  width?: Dimension;
  height?: Dimension;
}

export interface NamedStyles {
  styles?: NamedStyle[];
}

export interface NamedStyle {
  namedStyleType?: string;
  textStyle?: TextStyle;
  paragraphStyle?: ParagraphStyle;
}

export interface InlineObject {
  inlineObjectId?: string;
  objectId?: string;
  inlineObjectProperties?: InlineObjectProperties;
}

export interface InlineObjectProperties {
  embeddedObject?: EmbeddedObject;
}

export interface EmbeddedObject {
  imageProperties?: ImageProperties;
  embeddedObjectBorder?: EmbeddedObjectBorder;
  size?: Size;
  marginTop?: Dimension;
  marginBottom?: Dimension;
  marginRight?: Dimension;
  marginLeft?: Dimension;
  title?: string;
  description?: string;
}

export interface ImageProperties {
  contentUri?: string;
  sourceUri?: string;
  cropProperties?: CropProperties;
  angle?: number;
}

export interface CropProperties {
  offsetLeft?: number;
  offsetRight?: number;
  offsetTop?: number;
  offsetBottom?: number;
  angle?: number;
}

export interface EmbeddedObjectBorder {
  color?: OptionalColor;
  width?: Dimension;
  dashStyle?: string;
  propertyState?: string;
}

export interface NamedRange {
  namedRangeId?: string;
  name?: string;
  ranges?: Range[];
}

export interface NamedRanges {
  name?: string;
  namedRanges?: NamedRange[];
}

export interface Range {
  segmentId?: string;
  startIndex?: number;
  endIndex?: number;
}

// Request types for batchUpdate
export interface Request {
  insertText?: InsertTextRequest;
  deleteContentRange?: DeleteContentRangeRequest;
  insertInlineImage?: InsertInlineImageRequest;
  insertTable?: InsertTableRequest;
  insertTableRow?: InsertTableRowRequest;
  insertTableColumn?: InsertTableColumnRequest;
  deleteTableRow?: DeleteTableRowRequest;
  deleteTableColumn?: DeleteTableColumnRequest;
  insertPageBreak?: InsertPageBreakRequest;
  insertSectionBreak?: InsertSectionBreakRequest;
  updateTextStyle?: UpdateTextStyleRequest;
  updateParagraphStyle?: UpdateParagraphStyleRequest;
  createNamedRange?: CreateNamedRangeRequest;
  deleteNamedRange?: DeleteNamedRangeRequest;
  replaceAllText?: ReplaceAllTextRequest;
  createParagraphBullets?: CreateParagraphBulletsRequest;
  deleteParagraphBullets?: DeleteParagraphBulletsRequest;
  mergeTableCells?: MergeTableCellsRequest;
  unmergeTableCells?: UnmergeTableCellsRequest;
  updateTableColumnProperties?: UpdateTableColumnPropertiesRequest;
  updateTableCellStyle?: UpdateTableCellStyleRequest;
  updateTableRowStyle?: UpdateTableRowStyleRequest;
}

export interface InsertTextRequest {
  text: string;
  location?: Location;
  endOfSegmentLocation?: EndOfSegmentLocation;
}

export interface Location {
  segmentId?: string;
  index: number;
}

export interface EndOfSegmentLocation {
  segmentId?: string;
}

export interface DeleteContentRangeRequest {
  range: Range;
}

export interface InsertInlineImageRequest {
  uri: string;
  location?: Location;
  endOfSegmentLocation?: EndOfSegmentLocation;
  objectSize?: Size;
}

export interface InsertTableRequest {
  rows: number;
  columns: number;
  location?: Location;
  endOfSegmentLocation?: EndOfSegmentLocation;
}

export interface InsertTableRowRequest {
  tableCellLocation: TableCellLocation;
  insertBelow: boolean;
}

export interface TableCellLocation {
  tableStartLocation: Location;
  rowIndex: number;
  columnIndex: number;
}

export interface InsertTableColumnRequest {
  tableCellLocation: TableCellLocation;
  insertRight: boolean;
}

export interface DeleteTableRowRequest {
  tableCellLocation: TableCellLocation;
}

export interface DeleteTableColumnRequest {
  tableCellLocation: TableCellLocation;
}

export interface InsertPageBreakRequest {
  location?: Location;
  endOfSegmentLocation?: EndOfSegmentLocation;
}

export interface InsertSectionBreakRequest {
  location?: Location;
  endOfSegmentLocation?: EndOfSegmentLocation;
  sectionType: string;
}

export interface UpdateTextStyleRequest {
  range: Range;
  textStyle: TextStyle;
  fields: string;
}

export interface UpdateParagraphStyleRequest {
  range: Range;
  paragraphStyle: ParagraphStyle;
  fields: string;
}

export interface CreateNamedRangeRequest {
  name: string;
  range: Range;
}

export interface DeleteNamedRangeRequest {
  namedRangeId?: string;
  name?: string;
}

export interface ReplaceAllTextRequest {
  replaceText: string;
  containsText: SubstringMatchCriteria;
}

export interface SubstringMatchCriteria {
  text: string;
  matchCase: boolean;
}

export interface CreateParagraphBulletsRequest {
  range: Range;
  bulletPreset: string;
}

export interface DeleteParagraphBulletsRequest {
  range: Range;
}

export interface MergeTableCellsRequest {
  tableRange: TableRange;
}

export interface TableRange {
  tableCellLocation: TableCellLocation;
  rowSpan: number;
  columnSpan: number;
}

export interface UnmergeTableCellsRequest {
  tableRange: TableRange;
}

export interface UpdateTableColumnPropertiesRequest {
  tableStartLocation: Location;
  columnIndices: number[];
  tableColumnProperties: TableColumnProperties;
  fields: string;
}

export interface UpdateTableCellStyleRequest {
  tableCellLocation?: TableCellLocation;
  tableRange?: TableRange;
  tableStartLocation?: Location;
  tableCellStyle: TableCellStyle;
  fields: string;
}

export interface UpdateTableRowStyleRequest {
  tableStartLocation: Location;
  rowIndices: number[];
  tableRowStyle: TableRowStyle;
  fields: string;
}

export interface BatchUpdateResponse {
  documentId: string;
  replies: Reply[];
  writeControl?: WriteControl;
}

export interface Reply {
  createNamedRange?: CreateNamedRangeResponse;
  insertInlineImage?: InsertInlineImageResponse;
}

export interface CreateNamedRangeResponse {
  namedRangeId: string;
}

export interface InsertInlineImageResponse {
  objectId: string;
}

export interface WriteControl {
  requiredRevisionId?: string;
  targetRevisionId?: string;
}

// Drive API types for watching files
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  createdTime?: string;
  owners?: DriveUser[];
  lastModifyingUser?: DriveUser;
  webViewLink?: string;
}

export interface DriveUser {
  displayName?: string;
  emailAddress?: string;
  photoLink?: string;
}

export interface DriveWatchChannel {
  kind: string;
  id: string;
  resourceId: string;
  resourceUri: string;
  expiration: string;
}

export interface DriveChangeList {
  kind: string;
  nextPageToken?: string;
  newStartPageToken?: string;
  changes: DriveChange[];
}

export interface DriveChange {
  kind: string;
  changeType: string;
  time: string;
  removed: boolean;
  fileId?: string;
  file?: DriveFile;
}

export interface DriveStartPageTokenResponse {
  kind: string;
  startPageToken: string;
}

export class GoogleDocsClient {
  private docsAxios;
  private driveAxios;

  constructor(private config: { token: string }) {
    this.docsAxios = createAxios({
      baseURL: 'https://docs.googleapis.com/v1'
    });
    this.driveAxios = createAxios({
      baseURL: 'https://www.googleapis.com/drive/v3'
    });
  }

  private getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // Document Management
  async createDocument(title: string): Promise<Document> {
    let response = await this.docsAxios.post(
      '/documents',
      { title },
      {
        headers: this.getAuthHeaders()
      }
    );
    return response.data;
  }

  async getDocument(documentId: string): Promise<Document> {
    let response = await this.docsAxios.get(`/documents/${documentId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async batchUpdate(documentId: string, requests: Request[]): Promise<BatchUpdateResponse> {
    let response = await this.docsAxios.post(
      `/documents/${documentId}:batchUpdate`,
      {
        requests
      },
      {
        headers: this.getAuthHeaders()
      }
    );
    return response.data;
  }

  // Drive API methods for file management and watching
  async getDriveFile(fileId: string): Promise<DriveFile> {
    let response = await this.driveAxios.get(`/files/${fileId}`, {
      params: {
        fields:
          'id,name,mimeType,modifiedTime,createdTime,owners,lastModifyingUser,webViewLink'
      },
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async listDriveFiles(
    options: { query?: string; pageSize?: number; pageToken?: string; orderBy?: string } = {}
  ): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
    let params: Record<string, string | number> = {
      fields:
        'nextPageToken,files(id,name,mimeType,modifiedTime,createdTime,owners,lastModifyingUser,webViewLink)',
      pageSize: options.pageSize || 100
    };

    if (options.query) {
      params.q = options.query;
    }
    if (options.pageToken) {
      params.pageToken = options.pageToken;
    }
    if (options.orderBy) {
      params.orderBy = options.orderBy;
    }

    let response = await this.driveAxios.get('/files', {
      params,
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async watchFile(
    fileId: string,
    webhookUrl: string,
    channelId: string,
    expiration?: number
  ): Promise<DriveWatchChannel> {
    let body: Record<string, unknown> = {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl
    };

    if (expiration) {
      body.expiration = expiration;
    }

    let response = await this.driveAxios.post(`/files/${fileId}/watch`, body, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async stopWatchChannel(channelId: string, resourceId: string): Promise<void> {
    await this.driveAxios.post(
      '/channels/stop',
      {
        id: channelId,
        resourceId
      },
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  async getStartPageToken(): Promise<string> {
    let response = await this.driveAxios.get('/changes/startPageToken', {
      headers: this.getAuthHeaders()
    });
    return response.data.startPageToken;
  }

  async listChanges(pageToken: string, pageSize: number = 100): Promise<DriveChangeList> {
    let response = await this.driveAxios.get('/changes', {
      params: {
        pageToken,
        pageSize,
        fields:
          'kind,nextPageToken,newStartPageToken,changes(kind,changeType,time,removed,fileId,file(id,name,mimeType,modifiedTime,createdTime,owners,lastModifyingUser,webViewLink))'
      },
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Helper methods for common operations
  async insertText(
    documentId: string,
    text: string,
    index: number
  ): Promise<BatchUpdateResponse> {
    return this.batchUpdate(documentId, [
      {
        insertText: {
          text,
          location: { index }
        }
      }
    ]);
  }

  async appendText(documentId: string, text: string): Promise<BatchUpdateResponse> {
    return this.batchUpdate(documentId, [
      {
        insertText: {
          text,
          endOfSegmentLocation: {}
        }
      }
    ]);
  }

  async deleteText(
    documentId: string,
    startIndex: number,
    endIndex: number
  ): Promise<BatchUpdateResponse> {
    return this.batchUpdate(documentId, [
      {
        deleteContentRange: {
          range: {
            startIndex,
            endIndex
          }
        }
      }
    ]);
  }

  async replaceAllText(
    documentId: string,
    searchText: string,
    replaceText: string,
    matchCase: boolean = false
  ): Promise<BatchUpdateResponse> {
    return this.batchUpdate(documentId, [
      {
        replaceAllText: {
          replaceText,
          containsText: {
            text: searchText,
            matchCase
          }
        }
      }
    ]);
  }

  async insertImage(
    documentId: string,
    imageUri: string,
    index: number,
    width?: number,
    height?: number
  ): Promise<BatchUpdateResponse> {
    let request: InsertInlineImageRequest = {
      uri: imageUri,
      location: { index }
    };

    if (width && height) {
      request.objectSize = {
        width: { magnitude: width, unit: 'PT' },
        height: { magnitude: height, unit: 'PT' }
      };
    }

    return this.batchUpdate(documentId, [{ insertInlineImage: request }]);
  }

  async insertTable(
    documentId: string,
    rows: number,
    columns: number,
    index: number
  ): Promise<BatchUpdateResponse> {
    return this.batchUpdate(documentId, [
      {
        insertTable: {
          rows,
          columns,
          location: { index }
        }
      }
    ]);
  }

  async updateTextStyle(
    documentId: string,
    startIndex: number,
    endIndex: number,
    style: TextStyle
  ): Promise<BatchUpdateResponse> {
    let fields = Object.keys(style).join(',');
    return this.batchUpdate(documentId, [
      {
        updateTextStyle: {
          range: { startIndex, endIndex },
          textStyle: style,
          fields
        }
      }
    ]);
  }

  async createBulletList(
    documentId: string,
    startIndex: number,
    endIndex: number,
    bulletPreset: string = 'BULLET_DISC_CIRCLE_SQUARE'
  ): Promise<BatchUpdateResponse> {
    return this.batchUpdate(documentId, [
      {
        createParagraphBullets: {
          range: { startIndex, endIndex },
          bulletPreset
        }
      }
    ]);
  }

  async createNamedRange(
    documentId: string,
    name: string,
    startIndex: number,
    endIndex: number
  ): Promise<BatchUpdateResponse> {
    return this.batchUpdate(documentId, [
      {
        createNamedRange: {
          name,
          range: { startIndex, endIndex }
        }
      }
    ]);
  }

  async deleteNamedRange(
    documentId: string,
    namedRangeId?: string,
    name?: string
  ): Promise<BatchUpdateResponse> {
    let request: DeleteNamedRangeRequest = {};
    if (namedRangeId) {
      request.namedRangeId = namedRangeId;
    } else if (name) {
      request.name = name;
    } else {
      throw new Error('Either namedRangeId or name must be provided');
    }
    return this.batchUpdate(documentId, [{ deleteNamedRange: request }]);
  }
}
