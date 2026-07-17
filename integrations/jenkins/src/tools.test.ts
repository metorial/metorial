import { describe, expect, it } from 'vitest';
import {
  buildTestResultsResponse,
  testResultsOutputBudgetBytes,
  testResultTextBudgetBytes,
  testResultTruncationSuffix,
  truncateUtf8Text
} from './tools';

let serializedUtf8Bytes = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');

describe('Jenkins test result output bounds', () => {
  it('truncates by UTF-8 bytes without splitting Unicode code points', () => {
    let exactAscii = truncateUtf8Text('x'.repeat(testResultTextBudgetBytes));
    let oversizedAscii = truncateUtf8Text('x'.repeat(testResultTextBudgetBytes + 1));
    let exactUnicode = truncateUtf8Text('🙂'.repeat(testResultTextBudgetBytes / 4));
    let oversizedUnicode = truncateUtf8Text('🙂'.repeat(testResultTextBudgetBytes / 4 + 1));

    expect(exactAscii).toEqual({
      text: 'x'.repeat(testResultTextBudgetBytes),
      truncated: false
    });
    expect(serializedUtf8Bytes(exactAscii.text)).toBe(testResultTextBudgetBytes + 2);
    expect(oversizedAscii.truncated).toBe(true);
    expect(Buffer.byteLength(oversizedAscii.text ?? '', 'utf8')).toBe(
      testResultTextBudgetBytes
    );
    expect(oversizedAscii.text?.endsWith(testResultTruncationSuffix)).toBe(true);

    expect(exactUnicode.truncated).toBe(false);
    expect(Buffer.byteLength(exactUnicode.text ?? '', 'utf8')).toBe(testResultTextBudgetBytes);
    expect(oversizedUnicode.truncated).toBe(true);
    expect(Buffer.byteLength(oversizedUnicode.text ?? '', 'utf8')).toBeLessThanOrEqual(
      testResultTextBudgetBytes
    );
    expect(oversizedUnicode.text?.endsWith(testResultTruncationSuffix)).toBe(true);
    expect(oversizedUnicode.text).not.toContain('\uFFFD');
  });

  it('handles truncation suffix boundaries without exceeding the requested bytes', () => {
    let suffixBytes = Buffer.byteLength(testResultTruncationSuffix, 'utf8');
    let suffixOnly = truncateUtf8Text('long text'.repeat(10), suffixBytes);
    let tooSmallForSuffix = truncateUtf8Text('long text'.repeat(10), suffixBytes - 1);

    expect(suffixOnly).toEqual({ text: testResultTruncationSuffix, truncated: true });
    expect(tooSmallForSuffix.truncated).toBe(true);
    expect(tooSmallForSuffix.text?.endsWith(testResultTruncationSuffix)).toBe(false);
    expect(Buffer.byteLength(suffixOnly.text ?? '', 'utf8')).toBe(suffixBytes);
    expect(Buffer.byteLength(tooSmallForSuffix.text ?? '', 'utf8')).toBe(suffixBytes - 1);
  });

  it('preserves small raw reports and case properties within the aggregate budget', () => {
    let report = {
      totalCount: 1,
      failCount: 0,
      skipCount: 0,
      passCount: 1,
      reportMarker: 'raw-report',
      suites: [
        {
          name: 'small suite',
          cases: [
            {
              name: 'small case',
              status: 'PASSED',
              properties: { browser: 'webkit' },
              caseMarker: 'raw-case'
            }
          ]
        }
      ]
    };

    let response = buildTestResultsResponse({
      jobFullName: 'folder/job',
      buildNumber: 1,
      report,
      onlyFailingTests: false,
      includeCases: true,
      maxCases: 10,
      includeRawRequested: true
    });

    expect(serializedUtf8Bytes(response)).toBeLessThan(testResultsOutputBudgetBytes);
    expect(response.output.rawIncluded).toBe(true);
    expect(response.output.rawOmitted).toBe(false);
    expect(response.output.raw).toEqual(report);
    expect(response.output.cases?.[0]).toMatchObject({
      name: 'small case',
      properties: { browser: 'webkit' },
      raw: expect.objectContaining({ caseMarker: 'raw-case' })
    });
  });

  it('keeps many cases, raw reports, and oversized properties below the aggregate budget', () => {
    let oversizedRaw = 'r'.repeat(7_100_000);
    let unicodeDiagnostic = '🔥'.repeat(5000);
    let makeCase = (index: number) => ({
      className: `ExampleTest${index}`,
      name: `large diagnostics ${index}`,
      status: 'FAILED',
      errorDetails: unicodeDiagnostic,
      errorStackTrace: unicodeDiagnostic,
      skippedMessage: unicodeDiagnostic,
      stdout: unicodeDiagnostic,
      stderr: unicodeDiagnostic,
      properties: { oversizedRaw },
      rawPayload: oversizedRaw
    });
    let rootCases = Array.from({ length: 500 }, (_, index) => makeCase(index));
    let childCases = Array.from({ length: 500 }, (_, index) => makeCase(index + 500));
    let report = {
      totalCount: 1000,
      failCount: 1000,
      skipCount: 0,
      passCount: 0,
      oversizedRaw,
      suites: [{ name: 'root suite', cases: rootCases }],
      childReports: [
        {
          result: {
            suites: [{ name: 'child suite', cases: childCases }],
            oversizedRaw
          }
        }
      ]
    };

    let response = buildTestResultsResponse({
      jobFullName: `folder/${'🙂'.repeat(5000)}`,
      buildNumber: 2,
      report,
      onlyFailingTests: true,
      includeCases: true,
      maxCases: 1000,
      includeRawRequested: true
    });

    expect(serializedUtf8Bytes(response)).toBeLessThan(testResultsOutputBudgetBytes);
    expect(response.output.caseCount).toBe(1000);
    expect(response.output.returnedCaseCount).toBeGreaterThan(0);
    expect(response.output.returnedCaseCount).toBeLessThan(1000);
    expect(response.output.truncatedCases).toBe(true);
    expect(response.output.suiteCount).toBe(2);
    expect(response.output.outputTruncated).toBe(true);
    expect(response.output.truncatedTextFieldCount).toBeGreaterThan(0);
    expect(response.output.rawIncluded).toBe(false);
    expect(response.output.rawOmitted).toBe(true);
    expect(response.output.jobFullName.endsWith(testResultTruncationSuffix)).toBe(true);
    expect(Buffer.byteLength(response.output.jobFullName, 'utf8')).toBeLessThanOrEqual(
      testResultTextBudgetBytes
    );

    let returnedCase = response.output.cases?.[0] as Record<string, unknown> | undefined;
    expect(returnedCase).toBeDefined();
    expect(returnedCase).not.toHaveProperty('properties');
    expect(returnedCase).not.toHaveProperty('raw');
    expect(returnedCase?.skippedMessage).toBeTypeOf('string');
    expect(
      Buffer.byteLength(String(returnedCase?.skippedMessage), 'utf8')
    ).toBeLessThanOrEqual(testResultTextBudgetBytes);
    expect(returnedCase?.skippedMessage).toEqual(
      expect.stringMatching(/\.\.\.\[truncated\]$/)
    );
    expect(response.output).not.toHaveProperty('raw');
    expect(response.message).not.toContain(oversizedRaw);
  });

  it('prunes many suites across child reports when cases are not requested', () => {
    let oversizedSuiteText = '🙂'.repeat(5000);
    let makeSuites = (prefix: string, count: number) =>
      Array.from({ length: count }, (_, index) => ({
        name: `${prefix}-${index}`,
        stdout: oversizedSuiteText,
        stderr: oversizedSuiteText,
        cases: []
      }));
    let report = {
      suites: makeSuites('root', 500),
      childReports: [{ result: { suites: makeSuites('child', 500) } }]
    };

    let response = buildTestResultsResponse({
      jobFullName: 'folder/job',
      buildNumber: 3,
      report,
      onlyFailingTests: false,
      includeCases: false,
      maxCases: 1000,
      includeRawRequested: false
    });

    expect(serializedUtf8Bytes(response)).toBeLessThan(testResultsOutputBudgetBytes);
    expect(response.output.suiteCount).toBe(1000);
    expect(response.output.returnedSuiteCount).toBeGreaterThan(0);
    expect(response.output.returnedSuiteCount).toBeLessThan(1000);
    expect(response.output.truncatedSuites).toBe(true);
    expect(response.output.outputTruncated).toBe(true);
    expect(response.output.cases).toBeUndefined();
  });

  it('does not count hidden case diagnostics as truncated when cases are not requested', () => {
    let oversizedCaseText = '🔥'.repeat(5000);
    let response = buildTestResultsResponse({
      jobFullName: 'folder/job',
      buildNumber: 4,
      report: {
        totalCount: 2,
        failCount: 1,
        skipCount: 1,
        passCount: 0,
        suites: [
          {
            name: 'small suite',
            cases: [
              {
                name: 'hidden failure',
                status: 'FAILED',
                errorDetails: oversizedCaseText,
                errorStackTrace: oversizedCaseText,
                stdout: oversizedCaseText,
                stderr: oversizedCaseText,
                properties: { oversizedCaseText }
              },
              {
                name: 'hidden skip',
                status: 'SKIPPED',
                skipped: true,
                skippedMessage: oversizedCaseText
              }
            ]
          }
        ]
      },
      onlyFailingTests: false,
      includeCases: false,
      maxCases: 1000,
      includeRawRequested: false
    });

    expect(serializedUtf8Bytes(response)).toBeLessThan(testResultsOutputBudgetBytes);
    expect(response.output).toMatchObject({
      totalCount: 2,
      failCount: 1,
      skipCount: 1,
      passCount: 0,
      suiteCount: 1,
      returnedSuiteCount: 1,
      truncatedSuites: false,
      truncatedTextFieldCount: 0,
      outputTruncated: false
    });
    expect(response.output.suites[0]).toMatchObject({
      totalCount: 2,
      failCount: 1,
      skipCount: 1,
      passCount: 0
    });
    expect(response.output.caseCount).toBeUndefined();
    expect(response.output.returnedCaseCount).toBeUndefined();
    expect(response.output.truncatedCases).toBeUndefined();
    expect(response.output.cases).toBeUndefined();
  });
});
