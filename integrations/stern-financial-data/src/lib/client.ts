import { sternFinancialDataApiError, sternFinancialDataServiceError } from './errors';
import { extractRowsForSource, parseWorkbook } from './extractor';
import { SOURCES, type SourceId, type SourceType, type SternRow } from './sources';

export type SourceResult = {
  metadata: {
    source: SourceId;
    title: string;
    pageUrl: string;
    workbookUrl: string;
    retrievedAt: string;
    sourceType: SourceType;
    workbookFallbackReason?: string;
  };
  rows: SternRow[];
};

let FETCH_TIMEOUT_MS = 20_000;

let fetchWithTimeout = async (url: string, operation: string) => {
  let controller = new AbortController();
  let timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw sternFinancialDataServiceError(
        `Stern Financial Data ${operation} timed out after ${FETCH_TIMEOUT_MS}ms.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

let fetchText = async (url: string) => {
  try {
    let response = await fetchWithTimeout(url, 'HTML page fetch');

    if (!response.ok) {
      throw Object.assign(new Error(`${response.status} ${response.statusText}`), {
        status: response.status,
        statusText: response.statusText
      });
    }

    return await response.text();
  } catch (error) {
    throw sternFinancialDataApiError(error, 'HTML page fetch');
  }
};

let fetchBuffer = async (url: string) => {
  try {
    let response = await fetchWithTimeout(url, 'workbook fetch');

    if (!response.ok) {
      throw Object.assign(new Error(`${response.status} ${response.statusText}`), {
        status: response.status,
        statusText: response.statusText
      });
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    throw sternFinancialDataApiError(error, 'workbook fetch');
  }
};

let errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export class SternFinancialDataClient {
  async getSource(sourceId: SourceId): Promise<SourceResult> {
    let source = SOURCES[sourceId];
    let retrievedAt = new Date().toISOString();
    let pageHtml = await fetchText(source.pageUrl);
    let rows: SternRow[] = [];
    let sourceType: SourceType = 'workbook';
    let workbookFallbackReason: string | undefined;

    try {
      let workbook = parseWorkbook(await fetchBuffer(source.workbookUrl));
      rows = extractRowsForSource(sourceId, workbook, pageHtml);
    } catch (error) {
      workbookFallbackReason = errorMessage(error);
      sourceType = 'html';
      rows = extractRowsForSource(sourceId, null, pageHtml);
    }

    if (rows.length === 0) {
      throw sternFinancialDataServiceError(`No rows extracted for Stern source ${sourceId}.`);
    }

    return {
      metadata: {
        source: sourceId,
        title: source.title,
        pageUrl: source.pageUrl,
        workbookUrl: source.workbookUrl,
        retrievedAt,
        sourceType,
        workbookFallbackReason
      },
      rows
    };
  }
}
