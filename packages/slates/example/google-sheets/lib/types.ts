// Google Sheets API Types

export type ValueInputOption = 'RAW' | 'USER_ENTERED';
export type ValueRenderOption = 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
export type DateTimeRenderOption = 'SERIAL_NUMBER' | 'FORMATTED_STRING';
export type InsertDataOption = 'OVERWRITE' | 'INSERT_ROWS';
export type Dimension = 'ROWS' | 'COLUMNS';

export interface SpreadsheetProperties {
  title: string;
  locale?: string;
  autoRecalc?: 'ON_CHANGE' | 'MINUTE' | 'HOUR';
  timeZone?: string;
  defaultFormat?: CellFormat;
}

export interface SheetProperties {
  sheetId: number;
  title: string;
  index: number;
  sheetType?: 'GRID' | 'OBJECT' | 'DATA_SOURCE';
  gridProperties?: GridProperties;
  hidden?: boolean;
  tabColor?: Color;
  tabColorStyle?: ColorStyle;
}

export interface GridProperties {
  rowCount?: number;
  columnCount?: number;
  frozenRowCount?: number;
  frozenColumnCount?: number;
  hideGridlines?: boolean;
  rowGroupControlAfter?: boolean;
  columnGroupControlAfter?: boolean;
}

export interface Color {
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
}

export interface ColorStyle {
  rgbColor?: Color;
  themeColor?: string;
}

export interface CellFormat {
  numberFormat?: NumberFormat;
  backgroundColor?: Color;
  backgroundColorStyle?: ColorStyle;
  borders?: Borders;
  padding?: Padding;
  horizontalAlignment?: 'LEFT' | 'CENTER' | 'RIGHT';
  verticalAlignment?: 'TOP' | 'MIDDLE' | 'BOTTOM';
  wrapStrategy?: 'OVERFLOW_CELL' | 'LEGACY_WRAP' | 'CLIP' | 'WRAP';
  textDirection?: 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT';
  textFormat?: TextFormat;
  hyperlinkDisplayType?: 'LINKED' | 'PLAIN_TEXT';
  textRotation?: TextRotation;
}

export interface NumberFormat {
  type:
    | 'TEXT'
    | 'NUMBER'
    | 'PERCENT'
    | 'CURRENCY'
    | 'DATE'
    | 'TIME'
    | 'DATE_TIME'
    | 'SCIENTIFIC';
  pattern?: string;
}

export interface Borders {
  top?: Border;
  bottom?: Border;
  left?: Border;
  right?: Border;
}

export interface Border {
  style?: 'NONE' | 'DOTTED' | 'DASHED' | 'SOLID' | 'SOLID_MEDIUM' | 'SOLID_THICK' | 'DOUBLE';
  width?: number;
  color?: Color;
  colorStyle?: ColorStyle;
}

export interface Padding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface TextFormat {
  foregroundColor?: Color;
  foregroundColorStyle?: ColorStyle;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  link?: Link;
}

export interface Link {
  uri?: string;
}

export interface TextRotation {
  angle?: number;
  vertical?: boolean;
}

export interface Sheet {
  properties: SheetProperties;
  data?: GridData[];
  merges?: GridRange[];
  conditionalFormats?: ConditionalFormatRule[];
  filterViews?: FilterView[];
  protectedRanges?: ProtectedRange[];
  basicFilter?: BasicFilter;
  charts?: EmbeddedChart[];
  bandedRanges?: BandedRange[];
  developerMetadata?: DeveloperMetadata[];
  rowGroups?: DimensionGroup[];
  columnGroups?: DimensionGroup[];
  slicers?: Slicer[];
}

export interface GridData {
  startRow?: number;
  startColumn?: number;
  rowData?: RowData[];
  rowMetadata?: DimensionProperties[];
  columnMetadata?: DimensionProperties[];
}

export interface RowData {
  values?: CellData[];
}

export interface CellData {
  userEnteredValue?: ExtendedValue;
  effectiveValue?: ExtendedValue;
  formattedValue?: string;
  userEnteredFormat?: CellFormat;
  effectiveFormat?: CellFormat;
  hyperlink?: string;
  note?: string;
  textFormatRuns?: TextFormatRun[];
  dataValidation?: DataValidationRule;
  pivotTable?: PivotTable;
  dataSourceTable?: DataSourceTable;
  dataSourceFormula?: DataSourceFormula;
}

export interface ExtendedValue {
  numberValue?: number;
  stringValue?: string;
  boolValue?: boolean;
  formulaValue?: string;
  errorValue?: ErrorValue;
}

export interface ErrorValue {
  type:
    | 'ERROR_TYPE_UNSPECIFIED'
    | 'ERROR'
    | 'NULL_VALUE'
    | 'DIVIDE_BY_ZERO'
    | 'VALUE'
    | 'REF'
    | 'NAME'
    | 'NUM'
    | 'N_A'
    | 'LOADING';
  message?: string;
}

export interface TextFormatRun {
  startIndex?: number;
  format?: TextFormat;
}

export interface DataValidationRule {
  condition?: BooleanCondition;
  inputMessage?: string;
  strict?: boolean;
  showCustomUi?: boolean;
}

export interface BooleanCondition {
  type: string;
  values?: ConditionValue[];
}

export interface ConditionValue {
  relativeDate?: string;
  userEnteredValue?: string;
}

export interface PivotTable {
  source?: GridRange;
  rows?: PivotGroup[];
  columns?: PivotGroup[];
  criteria?: Record<string, PivotFilterCriteria>;
  filterSpecs?: PivotFilterSpec[];
  values?: PivotValue[];
  valueLayout?: 'HORIZONTAL' | 'VERTICAL';
  dataExecutionStatus?: DataExecutionStatus;
  dataSourceId?: string;
}

export interface PivotGroup {
  sourceColumnOffset?: number;
  showTotals?: boolean;
  valueMetadata?: PivotGroupValueMetadata[];
  sortOrder?: 'ASCENDING' | 'DESCENDING';
  valueBucket?: PivotGroupSortValueBucket;
  repeatHeadings?: boolean;
  label?: string;
  groupRule?: PivotGroupRule;
  groupLimit?: PivotGroupLimit;
  dataSourceColumnReference?: DataSourceColumnReference;
}

export interface PivotGroupValueMetadata {
  value?: ExtendedValue;
  collapsed?: boolean;
}

export interface PivotGroupSortValueBucket {
  valuesIndex?: number;
  buckets?: ExtendedValue[];
}

export interface PivotGroupRule {
  manualRule?: ManualRule;
  histogramRule?: HistogramRule;
  dateTimeRule?: DateTimeRule;
}

export interface ManualRule {
  groups?: ManualRuleGroup[];
}

export interface ManualRuleGroup {
  groupName?: ExtendedValue;
  items?: ExtendedValue[];
}

export interface HistogramRule {
  interval?: number;
  start?: number;
  end?: number;
}

export interface DateTimeRule {
  type: string;
}

export interface PivotGroupLimit {
  countLimit?: number;
  applyOrder?: number;
}

export interface DataSourceColumnReference {
  name?: string;
}

export interface PivotFilterCriteria {
  visibleValues?: string[];
  condition?: BooleanCondition;
  visibleByDefault?: boolean;
}

export interface PivotFilterSpec {
  columnOffsetIndex?: number;
  dataSourceColumnReference?: DataSourceColumnReference;
  filterCriteria?: PivotFilterCriteria;
}

export interface PivotValue {
  summarizeFunction?:
    | 'SUM'
    | 'COUNTA'
    | 'COUNT'
    | 'COUNTUNIQUE'
    | 'AVERAGE'
    | 'MAX'
    | 'MIN'
    | 'MEDIAN'
    | 'PRODUCT'
    | 'STDEV'
    | 'STDEVP'
    | 'VAR'
    | 'VARP'
    | 'CUSTOM';
  name?: string;
  calculatedDisplayType?:
    | 'PERCENT_OF_ROW_TOTAL'
    | 'PERCENT_OF_COLUMN_TOTAL'
    | 'PERCENT_OF_GRAND_TOTAL';
  sourceColumnOffset?: number;
  formula?: string;
  dataSourceColumnReference?: DataSourceColumnReference;
}

export interface DataExecutionStatus {
  state: 'NOT_STARTED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  errorCode?: string;
  errorMessage?: string;
  lastRefreshTime?: string;
}

export interface DataSourceTable {
  dataSourceId?: string;
  columnSelectionType?: 'SELECTED' | 'SYNC_ALL';
  columns?: DataSourceColumnReference[];
  filterSpecs?: FilterSpec[];
  sortSpecs?: SortSpec[];
  rowLimit?: number;
  dataExecutionStatus?: DataExecutionStatus;
}

export interface FilterSpec {
  filterCriteria?: FilterCriteria;
  columnIndex?: number;
  dataSourceColumnReference?: DataSourceColumnReference;
}

export interface FilterCriteria {
  hiddenValues?: string[];
  condition?: BooleanCondition;
  visibleBackgroundColor?: Color;
  visibleBackgroundColorStyle?: ColorStyle;
  visibleForegroundColor?: Color;
  visibleForegroundColorStyle?: ColorStyle;
}

export interface SortSpec {
  sortOrder?: 'ASCENDING' | 'DESCENDING';
  foregroundColor?: Color;
  foregroundColorStyle?: ColorStyle;
  backgroundColor?: Color;
  backgroundColorStyle?: ColorStyle;
  dimensionIndex?: number;
  dataSourceColumnReference?: DataSourceColumnReference;
}

export interface DataSourceFormula {
  dataSourceId?: string;
  dataExecutionStatus?: DataExecutionStatus;
}

export interface DimensionProperties {
  hiddenByFilter?: boolean;
  hiddenByUser?: boolean;
  pixelSize?: number;
  developerMetadata?: DeveloperMetadata[];
  dataSourceColumnReference?: DataSourceColumnReference;
}

export interface GridRange {
  sheetId?: number;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

export interface ConditionalFormatRule {
  ranges?: GridRange[];
  booleanRule?: BooleanRule;
  gradientRule?: GradientRule;
}

export interface BooleanRule {
  condition?: BooleanCondition;
  format?: CellFormat;
}

export interface GradientRule {
  minpoint?: InterpolationPoint;
  midpoint?: InterpolationPoint;
  maxpoint?: InterpolationPoint;
}

export interface InterpolationPoint {
  color?: Color;
  colorStyle?: ColorStyle;
  type?: 'MIN' | 'MAX' | 'NUMBER' | 'PERCENT' | 'PERCENTILE';
  value?: string;
}

export interface FilterView {
  filterViewId?: number;
  title?: string;
  range?: GridRange;
  namedRangeId?: string;
  sortSpecs?: SortSpec[];
  criteria?: Record<string, FilterCriteria>;
  filterSpecs?: FilterSpec[];
}

export interface ProtectedRange {
  protectedRangeId?: number;
  range?: GridRange;
  namedRangeId?: string;
  description?: string;
  warningOnly?: boolean;
  requestingUserCanEdit?: boolean;
  unprotectedRanges?: GridRange[];
  editors?: Editors;
}

export interface Editors {
  users?: string[];
  groups?: string[];
  domainUsersCanEdit?: boolean;
}

export interface BasicFilter {
  range?: GridRange;
  sortSpecs?: SortSpec[];
  criteria?: Record<string, FilterCriteria>;
  filterSpecs?: FilterSpec[];
}

export interface EmbeddedChart {
  chartId?: number;
  position?: EmbeddedObjectPosition;
  spec?: ChartSpec;
  border?: EmbeddedObjectBorder;
}

export interface EmbeddedObjectPosition {
  sheetId?: number;
  overlayPosition?: OverlayPosition;
  newSheet?: boolean;
}

export interface OverlayPosition {
  anchorCell?: GridCoordinate;
  offsetXPixels?: number;
  offsetYPixels?: number;
  widthPixels?: number;
  heightPixels?: number;
}

export interface GridCoordinate {
  sheetId?: number;
  rowIndex?: number;
  columnIndex?: number;
}

export interface ChartSpec {
  title?: string;
  altText?: string;
  titleTextFormat?: TextFormat;
  titleTextPosition?: TextPosition;
  subtitle?: string;
  subtitleTextFormat?: TextFormat;
  subtitleTextPosition?: TextPosition;
  fontName?: string;
  maximized?: boolean;
  backgroundColor?: Color;
  backgroundColorStyle?: ColorStyle;
  dataSourceChartProperties?: DataSourceChartProperties;
  filterSpecs?: FilterSpec[];
  sortSpecs?: SortSpec[];
  hiddenDimensionStrategy?:
    | 'SHOW_ALL'
    | 'SKIP_HIDDEN_ROWS_AND_COLUMNS'
    | 'SKIP_HIDDEN_ROWS'
    | 'SKIP_HIDDEN_COLUMNS';
  basicChart?: BasicChartSpec;
  pieChart?: PieChartSpec;
  bubbleChart?: BubbleChartSpec;
  candlestickChart?: CandlestickChartSpec;
  orgChart?: OrgChartSpec;
  histogramChart?: HistogramChartSpec;
  waterfallChart?: WaterfallChartSpec;
  treemapChart?: TreemapChartSpec;
  scorecardChart?: ScorecardChartSpec;
}

export interface TextPosition {
  horizontalAlignment?: 'LEFT' | 'CENTER' | 'RIGHT';
}

export interface DataSourceChartProperties {
  dataSourceId?: string;
  dataExecutionStatus?: DataExecutionStatus;
}

export interface BasicChartSpec {
  chartType?: 'BAR' | 'LINE' | 'AREA' | 'COLUMN' | 'SCATTER' | 'COMBO' | 'STEPPED_AREA';
  legendPosition?:
    | 'BOTTOM_LEGEND'
    | 'LEFT_LEGEND'
    | 'RIGHT_LEGEND'
    | 'TOP_LEGEND'
    | 'NO_LEGEND';
  axis?: BasicChartAxis[];
  domains?: BasicChartDomain[];
  series?: BasicChartSeries[];
  headerCount?: number;
  threeDimensional?: boolean;
  interpolateNulls?: boolean;
  stackedType?: 'NOT_STACKED' | 'STACKED' | 'PERCENT_STACKED';
  lineSmoothing?: boolean;
  compareMode?: 'DATUM' | 'CATEGORY';
  totalDataLabel?: DataLabel;
}

export interface BasicChartAxis {
  position?: 'BOTTOM_AXIS' | 'LEFT_AXIS' | 'RIGHT_AXIS';
  title?: string;
  format?: TextFormat;
  titleTextPosition?: TextPosition;
  viewWindowOptions?: ChartAxisViewWindowOptions;
}

export interface ChartAxisViewWindowOptions {
  viewWindowMin?: number;
  viewWindowMax?: number;
  viewWindowMode?:
    | 'DEFAULT_VIEW_WINDOW_MODE'
    | 'VIEW_WINDOW_MODE_UNSUPPORTED'
    | 'EXPLICIT'
    | 'PRETTY';
}

export interface BasicChartDomain {
  domain?: ChartData;
  reversed?: boolean;
}

export interface ChartData {
  sourceRange?: ChartSourceRange;
  columnReference?: DataSourceColumnReference;
  aggregateType?: 'AVERAGE' | 'COUNT' | 'MAX' | 'MEDIAN' | 'MIN' | 'SUM';
  groupRule?: ChartGroupRule;
}

export interface ChartSourceRange {
  sources?: GridRange[];
}

export interface ChartGroupRule {
  dateTimeRule?: ChartDateTimeRule;
  histogramRule?: ChartHistogramRule;
}

export interface ChartDateTimeRule {
  type?:
    | 'YEAR'
    | 'MONTH'
    | 'WEEK'
    | 'DAY_OF_YEAR'
    | 'DAY_OF_MONTH'
    | 'DAY_OF_WEEK'
    | 'HOUR'
    | 'HOUR_MINUTE'
    | 'HOUR_MINUTE_AMPM'
    | 'MINUTE'
    | 'SECOND'
    | 'YEAR_MONTH'
    | 'YEAR_QUARTER'
    | 'YEAR_MONTH_DAY';
}

export interface ChartHistogramRule {
  minValue?: number;
  maxValue?: number;
  intervalSize?: number;
}

export interface BasicChartSeries {
  series?: ChartData;
  targetAxis?: 'BOTTOM_AXIS' | 'LEFT_AXIS' | 'RIGHT_AXIS';
  type?: 'BAR' | 'LINE' | 'AREA' | 'COLUMN' | 'SCATTER' | 'COMBO' | 'STEPPED_AREA';
  lineStyle?: LineStyle;
  dataLabel?: DataLabel;
  color?: Color;
  colorStyle?: ColorStyle;
  pointStyle?: PointStyle;
  styleOverrides?: BasicSeriesDataPointStyleOverride[];
}

export interface LineStyle {
  width?: number;
  type?:
    | 'INVISIBLE'
    | 'SOLID'
    | 'DOTTED'
    | 'MEDIUM_DASHED'
    | 'MEDIUM_DASHED_DOTTED'
    | 'LONG_DASHED'
    | 'LONG_DASHED_DOTTED'
    | 'CUSTOM';
}

export interface DataLabel {
  type?: 'DATA_LABEL_TYPE_UNSPECIFIED' | 'NONE' | 'DATA' | 'CUSTOM';
  textFormat?: TextFormat;
  placement?:
    | 'ABOVE'
    | 'BELOW'
    | 'LEFT'
    | 'RIGHT'
    | 'CENTER'
    | 'INSIDE_END'
    | 'INSIDE_BASE'
    | 'OUTSIDE_END';
  customLabelData?: ChartData;
}

export interface PointStyle {
  size?: number;
  shape?:
    | 'CIRCLE'
    | 'DIAMOND'
    | 'HEXAGON'
    | 'PENTAGON'
    | 'SQUARE'
    | 'STAR'
    | 'TRIANGLE'
    | 'X_MARK';
}

export interface BasicSeriesDataPointStyleOverride {
  index?: number;
  color?: Color;
  colorStyle?: ColorStyle;
  pointStyle?: PointStyle;
}

export interface PieChartSpec {
  legendPosition?:
    | 'BOTTOM_LEGEND'
    | 'LEFT_LEGEND'
    | 'RIGHT_LEGEND'
    | 'TOP_LEGEND'
    | 'NO_LEGEND'
    | 'LABELED_LEGEND';
  domain?: ChartData;
  series?: ChartData;
  threeDimensional?: boolean;
  pieHole?: number;
}

export interface BubbleChartSpec {
  legendPosition?:
    | 'BOTTOM_LEGEND'
    | 'LEFT_LEGEND'
    | 'RIGHT_LEGEND'
    | 'TOP_LEGEND'
    | 'NO_LEGEND'
    | 'INSIDE_LEGEND';
  bubbleLabels?: ChartData;
  domain?: ChartData;
  series?: ChartData;
  groupIds?: ChartData;
  bubbleSizes?: ChartData;
  bubbleOpacity?: number;
  bubbleBorderColor?: Color;
  bubbleBorderColorStyle?: ColorStyle;
  bubbleMaxRadiusSize?: number;
  bubbleMinRadiusSize?: number;
  bubbleTextStyle?: TextFormat;
}

export interface CandlestickChartSpec {
  domain?: CandlestickDomain;
  data?: CandlestickData[];
}

export interface CandlestickDomain {
  data?: ChartData;
  reversed?: boolean;
}

export interface CandlestickData {
  lowSeries?: CandlestickSeries;
  openSeries?: CandlestickSeries;
  closeSeries?: CandlestickSeries;
  highSeries?: CandlestickSeries;
}

export interface CandlestickSeries {
  data?: ChartData;
}

export interface OrgChartSpec {
  nodeSize?: 'SMALL' | 'MEDIUM' | 'LARGE';
  nodeColor?: Color;
  nodeColorStyle?: ColorStyle;
  selectedNodeColor?: Color;
  selectedNodeColorStyle?: ColorStyle;
  labels?: ChartData;
  parentLabels?: ChartData;
  tooltips?: ChartData;
}

export interface HistogramChartSpec {
  series?: HistogramSeries[];
  legendPosition?:
    | 'BOTTOM_LEGEND'
    | 'LEFT_LEGEND'
    | 'RIGHT_LEGEND'
    | 'TOP_LEGEND'
    | 'NO_LEGEND'
    | 'INSIDE_LEGEND';
  showItemDividers?: boolean;
  bucketSize?: number;
  outlierPercentile?: number;
}

export interface HistogramSeries {
  barColor?: Color;
  barColorStyle?: ColorStyle;
  data?: ChartData;
}

export interface WaterfallChartSpec {
  domain?: WaterfallChartDomain;
  series?: WaterfallChartSeries[];
  stackedType?: 'NOT_STACKED' | 'STACKED' | 'SEQUENTIAL';
  firstValueIsTotal?: boolean;
  hideConnectorLines?: boolean;
  connectorLineStyle?: LineStyle;
  totalDataLabel?: DataLabel;
}

export interface WaterfallChartDomain {
  data?: ChartData;
  reversed?: boolean;
}

export interface WaterfallChartSeries {
  data?: ChartData;
  positiveColumnsStyle?: WaterfallChartColumnStyle;
  negativeColumnsStyle?: WaterfallChartColumnStyle;
  subtotalColumnsStyle?: WaterfallChartColumnStyle;
  hideTrailingSubtotal?: boolean;
  customSubtotals?: WaterfallChartCustomSubtotal[];
  dataLabel?: DataLabel;
}

export interface WaterfallChartColumnStyle {
  label?: string;
  color?: Color;
  colorStyle?: ColorStyle;
}

export interface WaterfallChartCustomSubtotal {
  subtotalIndex?: number;
  label?: string;
  dataIsSubtotal?: boolean;
}

export interface TreemapChartSpec {
  labels?: ChartData;
  parentLabels?: ChartData;
  sizeData?: ChartData;
  colorData?: ChartData;
  textFormat?: TextFormat;
  levels?: number;
  hintedLevels?: number;
  minValue?: number;
  maxValue?: number;
  headerColor?: Color;
  headerColorStyle?: ColorStyle;
  colorScale?: TreemapChartColorScale;
  hideTooltips?: boolean;
}

export interface TreemapChartColorScale {
  minValueColor?: Color;
  minValueColorStyle?: ColorStyle;
  midValueColor?: Color;
  midValueColorStyle?: ColorStyle;
  maxValueColor?: Color;
  maxValueColorStyle?: ColorStyle;
  noDataColor?: Color;
  noDataColorStyle?: ColorStyle;
}

export interface ScorecardChartSpec {
  keyValueData?: ChartData;
  baselineValueData?: ChartData;
  aggregateType?: 'AVERAGE' | 'COUNT' | 'MAX' | 'MEDIAN' | 'MIN' | 'SUM';
  keyValueFormat?: KeyValueFormat;
  baselineValueFormat?: BaselineValueFormat;
  scaleFactor?: number;
  numberFormatSource?: 'FROM_DATA' | 'CUSTOM';
  customFormatOptions?: ChartCustomNumberFormatOptions;
}

export interface KeyValueFormat {
  textFormat?: TextFormat;
  position?: TextPosition;
}

export interface BaselineValueFormat {
  comparisonType?: 'ABSOLUTE_DIFFERENCE' | 'PERCENTAGE_DIFFERENCE';
  textFormat?: TextFormat;
  position?: TextPosition;
  description?: string;
  positiveColor?: Color;
  positiveColorStyle?: ColorStyle;
  negativeColor?: Color;
  negativeColorStyle?: ColorStyle;
}

export interface ChartCustomNumberFormatOptions {
  prefix?: string;
  suffix?: string;
}

export interface EmbeddedObjectBorder {
  color?: Color;
  colorStyle?: ColorStyle;
}

export interface BandedRange {
  bandedRangeId?: number;
  range?: GridRange;
  rowProperties?: BandingProperties;
  columnProperties?: BandingProperties;
}

export interface BandingProperties {
  headerColor?: Color;
  headerColorStyle?: ColorStyle;
  firstBandColor?: Color;
  firstBandColorStyle?: ColorStyle;
  secondBandColor?: Color;
  secondBandColorStyle?: ColorStyle;
  footerColor?: Color;
  footerColorStyle?: ColorStyle;
}

export interface DeveloperMetadata {
  metadataId?: number;
  metadataKey?: string;
  metadataValue?: string;
  location?: DeveloperMetadataLocation;
  visibility?: 'DOCUMENT' | 'PROJECT';
}

export interface DeveloperMetadataLocation {
  locationType?:
    | 'ROW'
    | 'COLUMN'
    | 'SHEET'
    | 'SPREADSHEET'
    | 'DEVELOPER_METADATA_LOCATION_TYPE_UNSPECIFIED';
  spreadsheet?: boolean;
  sheetId?: number;
  dimensionRange?: DimensionRange;
}

export interface DimensionRange {
  sheetId?: number;
  dimension?: Dimension;
  startIndex?: number;
  endIndex?: number;
}

export interface DimensionGroup {
  range?: DimensionRange;
  depth?: number;
  collapsed?: boolean;
}

export interface Slicer {
  slicerId?: number;
  spec?: SlicerSpec;
  position?: EmbeddedObjectPosition;
}

export interface SlicerSpec {
  dataRange?: GridRange;
  filterCriteria?: FilterCriteria;
  columnIndex?: number;
  applyToPivotTables?: boolean;
  title?: string;
  textFormat?: TextFormat;
  backgroundColor?: Color;
  backgroundColorStyle?: ColorStyle;
  horizontalAlignment?: 'LEFT' | 'CENTER' | 'RIGHT';
}

export interface NamedRange {
  namedRangeId?: string;
  name?: string;
  range?: GridRange;
}

export interface DataSource {
  dataSourceId?: string;
  spec?: DataSourceSpec;
  calculatedColumns?: DataSourceColumn[];
  sheetId?: number;
}

export interface DataSourceSpec {
  bigQuery?: BigQueryDataSourceSpec;
  parameters?: DataSourceParameter[];
}

export interface BigQueryDataSourceSpec {
  projectId?: string;
  querySpec?: BigQueryQuerySpec;
  tableSpec?: BigQueryTableSpec;
}

export interface BigQueryQuerySpec {
  rawQuery?: string;
}

export interface BigQueryTableSpec {
  tableProjectId?: string;
  tableId?: string;
  datasetId?: string;
}

export interface DataSourceParameter {
  name?: string;
  namedRangeId?: string;
  range?: GridRange;
}

export interface DataSourceColumn {
  reference?: DataSourceColumnReference;
  formula?: string;
}

export interface DataSourceRefreshSchedule {
  enabled?: boolean;
  refreshScope?: 'ALL_DATA_SOURCES' | 'DATA_SOURCE_SHEET_SCOPE_UNSPECIFIED';
  nextRun?: Interval;
  dailySchedule?: DataSourceRefreshDailySchedule;
  weeklySchedule?: DataSourceRefreshWeeklySchedule;
  monthlySchedule?: DataSourceRefreshMonthlySchedule;
}

export interface Interval {
  startTime?: string;
  endTime?: string;
}

export interface DataSourceRefreshDailySchedule {
  startTime?: TimeOfDay;
}

export interface TimeOfDay {
  hours?: number;
  minutes?: number;
  seconds?: number;
  nanos?: number;
}

export interface DataSourceRefreshWeeklySchedule {
  startTime?: TimeOfDay;
  daysOfWeek?: (
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY'
  )[];
}

export interface DataSourceRefreshMonthlySchedule {
  startTime?: TimeOfDay;
  daysOfMonth?: number[];
}

export interface Spreadsheet {
  spreadsheetId: string;
  properties: SpreadsheetProperties;
  sheets?: Sheet[];
  namedRanges?: NamedRange[];
  spreadsheetUrl?: string;
  developerMetadata?: DeveloperMetadata[];
  dataSources?: DataSource[];
  dataSourceSchedules?: DataSourceRefreshSchedule[];
}

export interface ValueRange {
  range?: string;
  majorDimension?: Dimension;
  values?: (string | number | boolean | null)[][];
}

export interface UpdateValuesResponse {
  spreadsheetId?: string;
  updatedRange?: string;
  updatedRows?: number;
  updatedColumns?: number;
  updatedCells?: number;
  updatedData?: ValueRange;
}

export interface AppendValuesResponse {
  spreadsheetId?: string;
  tableRange?: string;
  updates?: UpdateValuesResponse;
}

export interface ClearValuesResponse {
  spreadsheetId?: string;
  clearedRange?: string;
}

export interface BatchGetValuesResponse {
  spreadsheetId?: string;
  valueRanges?: ValueRange[];
}

export interface BatchUpdateValuesResponse {
  spreadsheetId?: string;
  totalUpdatedRows?: number;
  totalUpdatedColumns?: number;
  totalUpdatedCells?: number;
  totalUpdatedSheets?: number;
  responses?: UpdateValuesResponse[];
}

export interface BatchUpdateSpreadsheetRequest {
  requests: Request[];
  includeSpreadsheetInResponse?: boolean;
  responseRanges?: string[];
  responseIncludeGridData?: boolean;
}

export interface BatchUpdateSpreadsheetResponse {
  spreadsheetId?: string;
  replies?: Response[];
  updatedSpreadsheet?: Spreadsheet;
}

export interface Request {
  updateSpreadsheetProperties?: UpdateSpreadsheetPropertiesRequest;
  updateSheetProperties?: UpdateSheetPropertiesRequest;
  updateDimensionProperties?: UpdateDimensionPropertiesRequest;
  updateNamedRange?: UpdateNamedRangeRequest;
  repeatCell?: RepeatCellRequest;
  addNamedRange?: AddNamedRangeRequest;
  deleteNamedRange?: DeleteNamedRangeRequest;
  addSheet?: AddSheetRequest;
  deleteSheet?: DeleteSheetRequest;
  autoFill?: AutoFillRequest;
  cutPaste?: CutPasteRequest;
  copyPaste?: CopyPasteRequest;
  mergeCells?: MergeCellsRequest;
  unmergeCells?: UnmergeCellsRequest;
  updateBorders?: UpdateBordersRequest;
  updateCells?: UpdateCellsRequest;
  addFilterView?: AddFilterViewRequest;
  appendCells?: AppendCellsRequest;
  clearBasicFilter?: ClearBasicFilterRequest;
  deleteDimension?: DeleteDimensionRequest;
  deleteEmbeddedObject?: DeleteEmbeddedObjectRequest;
  deleteFilterView?: DeleteFilterViewRequest;
  duplicateFilterView?: DuplicateFilterViewRequest;
  duplicateSheet?: DuplicateSheetRequest;
  findReplace?: FindReplaceRequest;
  insertDimension?: InsertDimensionRequest;
  insertRange?: InsertRangeRequest;
  moveDimension?: MoveDimensionRequest;
  updateEmbeddedObjectPosition?: UpdateEmbeddedObjectPositionRequest;
  pasteData?: PasteDataRequest;
  textToColumns?: TextToColumnsRequest;
  updateFilterView?: UpdateFilterViewRequest;
  deleteRange?: DeleteRangeRequest;
  appendDimension?: AppendDimensionRequest;
  addConditionalFormatRule?: AddConditionalFormatRuleRequest;
  updateConditionalFormatRule?: UpdateConditionalFormatRuleRequest;
  deleteConditionalFormatRule?: DeleteConditionalFormatRuleRequest;
  sortRange?: SortRangeRequest;
  setDataValidation?: SetDataValidationRequest;
  setBasicFilter?: SetBasicFilterRequest;
  addProtectedRange?: AddProtectedRangeRequest;
  updateProtectedRange?: UpdateProtectedRangeRequest;
  deleteProtectedRange?: DeleteProtectedRangeRequest;
  autoResizeDimensions?: AutoResizeDimensionsRequest;
  addChart?: AddChartRequest;
  updateChartSpec?: UpdateChartSpecRequest;
  updateBanding?: UpdateBandingRequest;
  addBanding?: AddBandingRequest;
  deleteBanding?: DeleteBandingRequest;
  createDeveloperMetadata?: CreateDeveloperMetadataRequest;
  updateDeveloperMetadata?: UpdateDeveloperMetadataRequest;
  deleteDeveloperMetadata?: DeleteDeveloperMetadataRequest;
  randomizeRange?: RandomizeRangeRequest;
  addDimensionGroup?: AddDimensionGroupRequest;
  deleteDimensionGroup?: DeleteDimensionGroupRequest;
  updateDimensionGroup?: UpdateDimensionGroupRequest;
  trimWhitespace?: TrimWhitespaceRequest;
  deleteDuplicates?: DeleteDuplicatesRequest;
  updateSlicerSpec?: UpdateSlicerSpecRequest;
  addSlicer?: AddSlicerRequest;
  updateEmbeddedObjectBorder?: UpdateEmbeddedObjectBorderRequest;
  addDataSource?: AddDataSourceRequest;
  updateDataSource?: UpdateDataSourceRequest;
  deleteDataSource?: DeleteDataSourceRequest;
  refreshDataSource?: RefreshDataSourceRequest;
  cancelDataSourceRefresh?: CancelDataSourceRefreshRequest;
}

export interface Response {
  addNamedRange?: AddNamedRangeResponse;
  addSheet?: AddSheetResponse;
  addFilterView?: AddFilterViewResponse;
  duplicateFilterView?: DuplicateFilterViewResponse;
  duplicateSheet?: DuplicateSheetResponse;
  findReplace?: FindReplaceResponse;
  updateEmbeddedObjectPosition?: UpdateEmbeddedObjectPositionResponse;
  updateConditionalFormatRule?: UpdateConditionalFormatRuleResponse;
  deleteConditionalFormatRule?: DeleteConditionalFormatRuleResponse;
  addProtectedRange?: AddProtectedRangeResponse;
  addChart?: AddChartResponse;
  addBanding?: AddBandingResponse;
  createDeveloperMetadata?: CreateDeveloperMetadataResponse;
  updateDeveloperMetadata?: UpdateDeveloperMetadataResponse;
  deleteDeveloperMetadata?: DeleteDeveloperMetadataResponse;
  addDimensionGroup?: AddDimensionGroupResponse;
  deleteDimensionGroup?: DeleteDimensionGroupResponse;
  trimWhitespace?: TrimWhitespaceResponse;
  deleteDuplicates?: DeleteDuplicatesResponse;
  addSlicer?: AddSlicerResponse;
  addDataSource?: AddDataSourceResponse;
  updateDataSource?: UpdateDataSourceResponse;
  refreshDataSource?: RefreshDataSourceResponse;
  cancelDataSourceRefresh?: CancelDataSourceRefreshResponse;
}

// Request types
export interface UpdateSpreadsheetPropertiesRequest {
  properties?: SpreadsheetProperties;
  fields?: string;
}

export interface UpdateSheetPropertiesRequest {
  properties?: SheetProperties;
  fields?: string;
}

export interface UpdateDimensionPropertiesRequest {
  range?: DimensionRange;
  properties?: DimensionProperties;
  fields?: string;
  dataSourceSheetRange?: DataSourceSheetDimensionRange;
}

export interface DataSourceSheetDimensionRange {
  sheetId?: number;
  columnReferences?: DataSourceColumnReference[];
}

export interface UpdateNamedRangeRequest {
  namedRange?: NamedRange;
  fields?: string;
}

export interface RepeatCellRequest {
  range?: GridRange;
  cell?: CellData;
  fields?: string;
}

export interface AddNamedRangeRequest {
  namedRange?: NamedRange;
}

export interface DeleteNamedRangeRequest {
  namedRangeId?: string;
}

export interface AddSheetRequest {
  properties?: SheetProperties;
}

export interface DeleteSheetRequest {
  sheetId?: number;
}

export interface AutoFillRequest {
  useAlternateSeries?: boolean;
  range?: GridRange;
  sourceAndDestination?: SourceAndDestination;
}

export interface SourceAndDestination {
  source?: GridRange;
  destination?: GridRange;
  dimension?: Dimension;
  fillLength?: number;
}

export interface CutPasteRequest {
  source?: GridRange;
  destination?: GridCoordinate;
  pasteType?: PasteType;
}

export type PasteType =
  | 'PASTE_NORMAL'
  | 'PASTE_VALUES'
  | 'PASTE_FORMAT'
  | 'PASTE_NO_BORDERS'
  | 'PASTE_FORMULA'
  | 'PASTE_DATA_VALIDATION'
  | 'PASTE_CONDITIONAL_FORMATTING';

export interface CopyPasteRequest {
  source?: GridRange;
  destination?: GridRange;
  pasteType?: PasteType;
  pasteOrientation?: 'NORMAL' | 'TRANSPOSE';
}

export interface MergeCellsRequest {
  range?: GridRange;
  mergeType?: 'MERGE_ALL' | 'MERGE_COLUMNS' | 'MERGE_ROWS';
}

export interface UnmergeCellsRequest {
  range?: GridRange;
}

export interface UpdateBordersRequest {
  range?: GridRange;
  top?: Border;
  bottom?: Border;
  left?: Border;
  right?: Border;
  innerHorizontal?: Border;
  innerVertical?: Border;
}

export interface UpdateCellsRequest {
  rows?: RowData[];
  fields?: string;
  start?: GridCoordinate;
  range?: GridRange;
}

export interface AddFilterViewRequest {
  filter?: FilterView;
}

export interface AppendCellsRequest {
  sheetId?: number;
  rows?: RowData[];
  fields?: string;
}

export interface ClearBasicFilterRequest {
  sheetId?: number;
}

export interface DeleteDimensionRequest {
  range?: DimensionRange;
}

export interface DeleteEmbeddedObjectRequest {
  objectId?: number;
}

export interface DeleteFilterViewRequest {
  filterId?: number;
}

export interface DuplicateFilterViewRequest {
  filterId?: number;
}

export interface DuplicateSheetRequest {
  sourceSheetId?: number;
  insertSheetIndex?: number;
  newSheetId?: number;
  newSheetName?: string;
}

export interface FindReplaceRequest {
  find?: string;
  replacement?: string;
  matchCase?: boolean;
  matchEntireCell?: boolean;
  searchByRegex?: boolean;
  includeFormulas?: boolean;
  range?: GridRange;
  sheetId?: number;
  allSheets?: boolean;
}

export interface InsertDimensionRequest {
  range?: DimensionRange;
  inheritFromBefore?: boolean;
}

export interface InsertRangeRequest {
  range?: GridRange;
  shiftDimension?: Dimension;
}

export interface MoveDimensionRequest {
  source?: DimensionRange;
  destinationIndex?: number;
}

export interface UpdateEmbeddedObjectPositionRequest {
  objectId?: number;
  newPosition?: EmbeddedObjectPosition;
  fields?: string;
}

export interface PasteDataRequest {
  coordinate?: GridCoordinate;
  data?: string;
  type?: PasteType;
  delimiter?: string;
  html?: boolean;
}

export interface TextToColumnsRequest {
  source?: GridRange;
  delimiter?: string;
  delimiterType?:
    | 'DELIMITER_TYPE_UNSPECIFIED'
    | 'COMMA'
    | 'SEMICOLON'
    | 'PERIOD'
    | 'SPACE'
    | 'CUSTOM'
    | 'AUTODETECT';
}

export interface UpdateFilterViewRequest {
  filter?: FilterView;
  fields?: string;
}

export interface DeleteRangeRequest {
  range?: GridRange;
  shiftDimension?: Dimension;
}

export interface AppendDimensionRequest {
  sheetId?: number;
  dimension?: Dimension;
  length?: number;
}

export interface AddConditionalFormatRuleRequest {
  rule?: ConditionalFormatRule;
  index?: number;
}

export interface UpdateConditionalFormatRuleRequest {
  index?: number;
  rule?: ConditionalFormatRule;
  sheetId?: number;
  newIndex?: number;
}

export interface DeleteConditionalFormatRuleRequest {
  index?: number;
  sheetId?: number;
}

export interface SortRangeRequest {
  range?: GridRange;
  sortSpecs?: SortSpec[];
}

export interface SetDataValidationRequest {
  range?: GridRange;
  rule?: DataValidationRule;
}

export interface SetBasicFilterRequest {
  filter?: BasicFilter;
}

export interface AddProtectedRangeRequest {
  protectedRange?: ProtectedRange;
}

export interface UpdateProtectedRangeRequest {
  protectedRange?: ProtectedRange;
  fields?: string;
}

export interface DeleteProtectedRangeRequest {
  protectedRangeId?: number;
}

export interface AutoResizeDimensionsRequest {
  dimensions?: DimensionRange;
  dataSourceSheetDimensions?: DataSourceSheetDimensionRange;
}

export interface AddChartRequest {
  chart?: EmbeddedChart;
}

export interface UpdateChartSpecRequest {
  chartId?: number;
  spec?: ChartSpec;
}

export interface UpdateBandingRequest {
  bandedRange?: BandedRange;
  fields?: string;
}

export interface AddBandingRequest {
  bandedRange?: BandedRange;
}

export interface DeleteBandingRequest {
  bandedRangeId?: number;
}

export interface CreateDeveloperMetadataRequest {
  developerMetadata?: DeveloperMetadata;
}

export interface UpdateDeveloperMetadataRequest {
  dataFilters?: DataFilter[];
  developerMetadata?: DeveloperMetadata;
  fields?: string;
}

export interface DataFilter {
  developerMetadataLookup?: DeveloperMetadataLookup;
  a1Range?: string;
  gridRange?: GridRange;
}

export interface DeveloperMetadataLookup {
  locationType?:
    | 'ROW'
    | 'COLUMN'
    | 'SHEET'
    | 'SPREADSHEET'
    | 'DEVELOPER_METADATA_LOCATION_TYPE_UNSPECIFIED';
  metadataLocation?: DeveloperMetadataLocation;
  locationMatchingStrategy?: 'EXACT_LOCATION' | 'INTERSECTING_LOCATION';
  metadataId?: number;
  metadataKey?: string;
  metadataValue?: string;
  visibility?: 'DOCUMENT' | 'PROJECT';
}

export interface DeleteDeveloperMetadataRequest {
  dataFilter?: DataFilter;
}

export interface RandomizeRangeRequest {
  range?: GridRange;
}

export interface AddDimensionGroupRequest {
  range?: DimensionRange;
}

export interface DeleteDimensionGroupRequest {
  range?: DimensionRange;
}

export interface UpdateDimensionGroupRequest {
  dimensionGroup?: DimensionGroup;
  fields?: string;
}

export interface TrimWhitespaceRequest {
  range?: GridRange;
}

export interface DeleteDuplicatesRequest {
  range?: GridRange;
  comparisonColumns?: DimensionRange[];
}

export interface UpdateSlicerSpecRequest {
  slicerId?: number;
  spec?: SlicerSpec;
  fields?: string;
}

export interface AddSlicerRequest {
  slicer?: Slicer;
}

export interface UpdateEmbeddedObjectBorderRequest {
  objectId?: number;
  border?: EmbeddedObjectBorder;
  fields?: string;
}

export interface AddDataSourceRequest {
  dataSource?: DataSource;
}

export interface UpdateDataSourceRequest {
  dataSource?: DataSource;
  fields?: string;
}

export interface DeleteDataSourceRequest {
  dataSourceId?: string;
}

export interface RefreshDataSourceRequest {
  dataSourceId?: string;
  references?: DataSourceObjectReferences;
  force?: boolean;
  isAll?: boolean;
}

export interface DataSourceObjectReferences {
  references?: DataSourceObjectReference[];
}

export interface DataSourceObjectReference {
  sheetId?: string;
  chartId?: number;
  dataSourceTableAnchorCell?: GridCoordinate;
  dataSourcePivotTableAnchorCell?: GridCoordinate;
  dataSourceFormulaCell?: GridCoordinate;
}

export interface CancelDataSourceRefreshRequest {
  dataSourceId?: string;
  references?: DataSourceObjectReferences;
  isAll?: boolean;
}

// Response types
export interface AddNamedRangeResponse {
  namedRange?: NamedRange;
}

export interface AddSheetResponse {
  properties?: SheetProperties;
}

export interface AddFilterViewResponse {
  filter?: FilterView;
}

export interface DuplicateFilterViewResponse {
  filter?: FilterView;
}

export interface DuplicateSheetResponse {
  properties?: SheetProperties;
}

export interface FindReplaceResponse {
  valuesChanged?: number;
  formulasChanged?: number;
  rowsChanged?: number;
  sheetsChanged?: number;
  occurrencesChanged?: number;
}

export interface UpdateEmbeddedObjectPositionResponse {
  position?: EmbeddedObjectPosition;
}

export interface UpdateConditionalFormatRuleResponse {
  newRule?: ConditionalFormatRule;
  newIndex?: number;
  oldRule?: ConditionalFormatRule;
  oldIndex?: number;
}

export interface DeleteConditionalFormatRuleResponse {
  rule?: ConditionalFormatRule;
}

export interface AddProtectedRangeResponse {
  protectedRange?: ProtectedRange;
}

export interface AddChartResponse {
  chart?: EmbeddedChart;
}

export interface AddBandingResponse {
  bandedRange?: BandedRange;
}

export interface CreateDeveloperMetadataResponse {
  developerMetadata?: DeveloperMetadata;
}

export interface UpdateDeveloperMetadataResponse {
  developerMetadata?: DeveloperMetadata[];
}

export interface DeleteDeveloperMetadataResponse {
  deletedDeveloperMetadata?: DeveloperMetadata[];
}

export interface AddDimensionGroupResponse {
  dimensionGroups?: DimensionGroup[];
}

export interface DeleteDimensionGroupResponse {
  dimensionGroups?: DimensionGroup[];
}

export interface TrimWhitespaceResponse {
  cellsChangedCount?: number;
}

export interface DeleteDuplicatesResponse {
  duplicatesRemovedCount?: number;
}

export interface AddSlicerResponse {
  slicer?: Slicer;
}

export interface AddDataSourceResponse {
  dataSource?: DataSource;
  dataExecutionStatus?: DataExecutionStatus;
}

export interface UpdateDataSourceResponse {
  dataSource?: DataSource;
  dataExecutionStatus?: DataExecutionStatus;
}

export interface RefreshDataSourceResponse {
  statuses?: RefreshDataSourceObjectExecutionStatus[];
}

export interface RefreshDataSourceObjectExecutionStatus {
  reference?: DataSourceObjectReference;
  dataExecutionStatus?: DataExecutionStatus;
}

export interface CancelDataSourceRefreshResponse {
  statuses?: CancelDataSourceRefreshStatus[];
}

export interface CancelDataSourceRefreshStatus {
  reference?: DataSourceObjectReference;
  refreshCancellationStatus?: RefreshCancellationStatus;
}

export interface RefreshCancellationStatus {
  state?: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  errorCode?: string;
}
