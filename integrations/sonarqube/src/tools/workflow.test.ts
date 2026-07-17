import { describe, expect, it } from 'vitest';
import {
  mapAdvancedIssue,
  readWorkspaceFileContent,
  resolveAdvancedAnalysisFileContent,
  resolveWorkspaceFilePath
} from './analysis';
import {
  coverageDetailsFromLines,
  coverageProjectSummary,
  mapCoverageFile,
  normalizeCoverageLines
} from './coverage';
import { validateManageHotspotInput, validateSearchHotspotsInput } from './hotspots';
import { mapSearchMetric } from './measures';
import { sourceAttachmentMetadata } from './source';

describe('SonarQube workflow tool helpers', () => {
  it('validates hotspot review status combinations', () => {
    expect(() =>
      validateManageHotspotInput({
        hotspotKey: 'HOTSPOT-1',
        status: 'REVIEWED'
      })
    ).toThrow(/resolution/);

    expect(() =>
      validateManageHotspotInput({
        hotspotKey: 'HOTSPOT-1',
        status: 'TO_REVIEW',
        resolution: 'SAFE'
      })
    ).toThrow(/Resolution/);

    expect(() =>
      validateManageHotspotInput({
        hotspotKey: 'HOTSPOT-1',
        status: 'REVIEWED',
        resolution: 'SAFE'
      })
    ).not.toThrow();
  });

  it('accepts upstream hotspot resolutions and validates search identifiers', () => {
    expect(() =>
      validateManageHotspotInput({
        hotspotKey: 'HOTSPOT-1',
        status: 'REVIEWED',
        resolution: 'ACKNOWLEDGED'
      })
    ).not.toThrow();

    expect(() =>
      validateSearchHotspotsInput({
        hotspotKeys: ['HOTSPOT-1'],
        resolution: 'ACKNOWLEDGED'
      })
    ).not.toThrow();

    expect(() => validateSearchHotspotsInput({ hotspotKeys: [] })).toThrow(
      /'projectKey' or 'hotspotKeys'/
    );
  });

  it('builds source attachment metadata without inline file output fields', () => {
    let content = 'let answer = 42;\nconsole.log(answer);';

    expect(sourceAttachmentMetadata(content)).toEqual({
      mimeType: 'text/plain',
      byteLength: Buffer.byteLength(content, 'utf8'),
      attachmentCount: 1
    });
  });

  it('resolves advanced-analysis files within the current workspace', async () => {
    let filePath = 'src/tools/analysis.ts';

    expect(resolveWorkspaceFilePath(filePath, process.cwd())).toContain(filePath);
    await expect(readWorkspaceFileContent(filePath, process.cwd())).resolves.toContain(
      'run_advanced_code_analysis'
    );
    expect(() => resolveWorkspaceFilePath('../outside.ts', process.cwd())).toThrow(
      /within the current workspace/
    );
    expect(() => resolveWorkspaceFilePath('/tmp/outside.ts', process.cwd())).toThrow(
      /relative/
    );
  });

  it('uses supplied advanced-analysis content without reading the integration workspace', async () => {
    await expect(
      resolveAdvancedAnalysisFileContent(
        'source/not-present-in-provider-runtime.ts',
        'const answer = 42;'
      )
    ).resolves.toBe('const answer = 42;');
    await expect(
      resolveAdvancedAnalysisFileContent('../outside.ts', 'const answer = 42;')
    ).rejects.toThrow(/within the current workspace/);
  });

  it('omits empty advanced-analysis flows and locations like the official mapper', () => {
    expect(
      mapAdvancedIssue({
        id: 'issue-1',
        message: 'message',
        rule: 'java:S100',
        flows: []
      })
    ).not.toHaveProperty('flows');

    let issueWithFlow = mapAdvancedIssue({
      id: 'issue-1',
      message: 'message',
      rule: 'java:S100',
      flows: [
        {
          type: 'DATA',
          locations: []
        }
      ]
    }) as Record<string, unknown>;
    let flows = issueWithFlow.flows as Record<string, unknown>[];

    expect(flows[0]).not.toHaveProperty('locations');
  });

  it('defaults missing search metric booleans to false like the official mapper', () => {
    expect(
      mapSearchMetric({
        id: '1',
        key: 'ncloc',
        name: 'Lines of Code',
        type: 'INT'
      })
    ).toMatchObject({
      hidden: false,
      custom: false
    });
  });

  it('maps coverage files with path fallback and parsed measures like the official tool', () => {
    expect(
      mapCoverageFile({
        key: 'app:src/main.ts',
        name: 'main.ts',
        measures: [
          { metric: 'coverage', value: '42.5' },
          { metric: 'lines_to_cover', value: '80' },
          { metric: 'uncovered_lines', value: '46' }
        ]
      })
    ).toEqual({
      key: 'app:src/main.ts',
      path: 'main.ts',
      coverage: 42.5,
      lineCoverage: undefined,
      branchCoverage: undefined,
      linesToCover: 80,
      uncoveredLines: 46,
      conditionsToCover: undefined,
      uncoveredConditions: undefined
    });

    expect(
      coverageProjectSummary({
        component: {
          key: 'app',
          measures: [{ metric: 'coverage', value: '61.3' }]
        }
      })
    ).toEqual({
      coverage: 61.3,
      linesToCover: undefined,
      uncoveredLines: undefined
    });
    expect(coverageProjectSummary({})).toBeUndefined();
  });

  it('computes file coverage details from source lines like the official tool', () => {
    let lines = normalizeCoverageLines({
      sources: [
        { line: 1, code: 'import x;' },
        { line: 2, code: 'covered();', lineHits: 3 },
        { line: 3, code: 'uncovered();', lineHits: 0 },
        { line: 4, code: 'if (a || b) {', lineHits: 1, conditions: 4, coveredConditions: 2 },
        { line: 5, code: 'if (c) {', lineHits: 1, conditions: 2, coveredConditions: 0 }
      ]
    });
    let details = coverageDetailsFromLines(lines);

    expect(details.summary).toEqual({
      totalLines: 5,
      coverableLines: 4,
      coveredLines: 3,
      uncoveredLines: 1,
      lineCoveragePercent: 75,
      totalConditions: 6,
      coveredConditions: 2,
      uncoveredConditions: 4,
      branchCoveragePercent: (2 * 100) / 6
    });
    expect(details.uncoveredLines).toEqual([{ lineNumber: 3 }]);
    expect(details.partiallyConditionalLines).toEqual([
      {
        lineNumber: 4,
        totalConditions: 4,
        coveredConditions: 2,
        uncoveredConditions: 2
      },
      {
        lineNumber: 5,
        totalConditions: 2,
        coveredConditions: 0,
        uncoveredConditions: 2
      }
    ]);
  });

  it('reports full coverage percentages for files without coverable lines or conditions', () => {
    let details = coverageDetailsFromLines(
      normalizeCoverageLines({
        sources: [{ line: 1, code: 'declare const x: number;' }]
      })
    );

    expect(details.summary.lineCoveragePercent).toBe(100);
    expect(details.summary.branchCoveragePercent).toBe(100);
    expect(details.uncoveredLines).toEqual([]);
    expect(details.partiallyConditionalLines).toEqual([]);
  });
});
