import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('SonarQube tool input schemas', provider.actions);

let inputJsonSchemaFor = (toolKey: string) => {
  let tool = provider.actions.find(action => action.key === toolKey);

  return z.toJSONSchema(tool?.inputSchema ?? z.object({})) as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
};

describe('SonarQube official MCP tool registration', () => {
  it('registers the requested official tool keys', () => {
    let keys = provider.actions.map(action => action.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        'ping_system',
        'search_my_sonarqube_projects',
        'list_branches',
        'list_pull_requests',
        'get_project_quality_gate_status',
        'show_rule',
        'list_quality_gates',
        'search_metrics',
        'get_component_measures',
        'search_files_by_coverage',
        'get_file_coverage_details',
        'change_sonar_issue_status',
        'run_advanced_code_analysis',
        'search_dependency_risks'
      ])
    );
  });
});

describe('SonarQube system ping schema', () => {
  it('uses an exact empty object input schema', () => {
    let schema = inputJsonSchemaFor('ping_system') as {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };

    expect(schema.type).toBe('object');
    expect(schema.properties).toEqual({});
    expect(schema.required).toBeUndefined();
  });
});

describe('SonarQube canonical pagination schemas', () => {
  it('uses pageIndex for project search', () => {
    let tool = provider.actions.find(action => action.key === 'search_my_sonarqube_projects');
    let result = tool?.inputSchema.safeParse({
      pageIndex: 2,
      pageSize: 50,
      q: 'app'
    });
    let schema = inputJsonSchemaFor('search_my_sonarqube_projects');

    expect(result?.success).toBe(true);
    expect(schema.properties).toHaveProperty('pageIndex');
    expect(schema.properties).not.toHaveProperty('page');
  });

  it('uses pageIndex and pageSize for metric search', () => {
    let tool = provider.actions.find(action => action.key === 'search_metrics');
    let result = tool?.inputSchema.safeParse({
      pageIndex: 2.5,
      pageSize: 50.5
    });
    let schema = inputJsonSchemaFor('search_metrics');

    expect(result?.success).toBe(true);
    expect(schema.properties).toHaveProperty('pageIndex');
    expect(schema.properties).toHaveProperty('pageSize');
    expect(schema.properties).not.toHaveProperty('p');
    expect(schema.properties).not.toHaveProperty('ps');
  });
});

describe('SonarQube coverage schemas', () => {
  let searchFilesByCoverageTool = provider.actions.find(
    action => action.key === 'search_files_by_coverage'
  );
  let getFileCoverageDetailsTool = provider.actions.find(
    action => action.key === 'get_file_coverage_details'
  );

  it('accepts the official file coverage search inputs', () => {
    let result = searchFilesByCoverageTool?.inputSchema.safeParse({
      projectKey: 'app',
      branch: 'main',
      maxCoverage: 80,
      pageIndex: 1,
      pageSize: 100
    });

    expect(result?.success).toBe(true);
  });

  it('accepts the official file coverage details inputs and requires key', () => {
    expect(
      getFileCoverageDetailsTool?.inputSchema.safeParse({
        key: 'app:src/main.ts',
        pullRequest: '42'
      })?.success
    ).toBe(true);

    expect(getFileCoverageDetailsTool?.inputSchema.safeParse({})?.success).toBe(false);
  });
});

describe('SonarQube search issue schema', () => {
  let searchIssuesTool = provider.actions.find(
    action => action.key === 'search_sonar_issues_in_projects'
  );

  it('rejects legacy issue severities that the official tool does not expose', () => {
    let result = searchIssuesTool?.inputSchema.safeParse({
      severities: ['MAJOR']
    });

    expect(result?.success).toBe(false);
  });

  it('accepts current issue status and software-quality filters', () => {
    let result = searchIssuesTool?.inputSchema.safeParse({
      projectKeys: ['app'],
      issueStatuses: ['OPEN'],
      impactSoftwareQualities: ['SECURITY'],
      severities: ['HIGH'],
      files: ['app:src/main.ts'],
      pageIndex: 2,
      pageSize: 50
    });
    let schema = inputJsonSchemaFor('search_sonar_issues_in_projects');

    expect(result?.success).toBe(true);
    expect(schema.properties).toHaveProperty('projectKeys');
    expect(schema.properties).toHaveProperty('pageIndex');
    expect(schema.properties).toHaveProperty('pageSize');
    expect(schema.properties).not.toHaveProperty('projects');
    expect(schema.properties).not.toHaveProperty('p');
    expect(schema.properties).not.toHaveProperty('ps');
  });
});

describe('SonarQube manage issue schema', () => {
  let manageIssueTool = provider.actions.find(
    action => action.key === 'change_sonar_issue_status'
  );

  it('accepts official issue transition status values', () => {
    let result = manageIssueTool?.inputSchema.safeParse({
      key: 'ISSUE-1',
      status: 'accept'
    });

    expect(result?.success).toBe(true);
  });

  it('rejects unsupported issue transition values', () => {
    let result = manageIssueTool?.inputSchema.safeParse({
      key: 'ISSUE-1',
      status: 'confirm'
    });

    expect(result?.success).toBe(false);
  });
});

describe('SonarQube security hotspot schema', () => {
  let searchHotspotsTool = provider.actions.find(
    action => action.key === 'search_security_hotspots'
  );
  let manageHotspotTool = provider.actions.find(
    action => action.key === 'change_security_hotspot_status'
  );

  it('accepts hotspot-key-only search input', () => {
    let result = searchHotspotsTool?.inputSchema.safeParse({
      hotspotKeys: ['HOTSPOT-1'],
      pageIndex: 2,
      pageSize: 50
    });
    let schema = inputJsonSchemaFor('search_security_hotspots');

    expect(result?.success).toBe(true);
    expect(schema.properties).toHaveProperty('pageIndex');
    expect(schema.properties).toHaveProperty('pageSize');
    expect(schema.properties).not.toHaveProperty('p');
    expect(schema.properties).not.toHaveProperty('ps');
  });

  it('accepts ACKNOWLEDGED hotspot resolution', () => {
    let result = manageHotspotTool?.inputSchema.safeParse({
      hotspotKey: 'HOTSPOT-1',
      status: 'REVIEWED',
      resolution: 'ACKNOWLEDGED'
    });

    expect(result?.success).toBe(true);
  });
});

describe('SonarQube duplicated file search schema', () => {
  let searchDuplicatedFilesTool = provider.actions.find(
    action => action.key === 'search_duplicated_files'
  );

  it('accepts project and branch inputs', () => {
    let result = searchDuplicatedFilesTool?.inputSchema.safeParse({
      projectKey: 'app',
      branch: 'main',
      pageSize: 10
    });

    expect(result?.success).toBe(true);
  });
});

describe('SonarQube advanced analysis schema', () => {
  let advancedAnalysisTool = provider.actions.find(
    action => action.key === 'run_advanced_code_analysis'
  );

  it('accepts the official advanced analysis inputs', () => {
    let result = advancedAnalysisTool?.inputSchema.safeParse({
      projectKey: 'app',
      branch: 'main',
      filePath: 'src/main.ts',
      fileScope: 'MAIN'
    });
    let schema = inputJsonSchemaFor('run_advanced_code_analysis');

    expect(result?.success).toBe(true);
    expect(schema.required).toContain('branch');
    expect(schema.properties).toHaveProperty('branch');
    expect(schema.properties).not.toHaveProperty('branchName');
  });

  it('does not expose fileContent in the workspace-backed schema', () => {
    let schema = z.toJSONSchema(advancedAnalysisTool?.inputSchema ?? z.object({})) as {
      properties?: Record<string, unknown>;
    };

    expect(schema.properties).not.toHaveProperty('fileContent');
  });

  it('rejects unsupported advanced analysis file scopes', () => {
    let result = advancedAnalysisTool?.inputSchema.safeParse({
      projectKey: 'app',
      branch: 'main',
      filePath: 'src/main.ts',
      fileScope: 'SOURCE'
    });

    expect(result?.success).toBe(false);
  });
});

describe('SonarQube dependency risks schema', () => {
  let dependencyRisksTool = provider.actions.find(
    action => action.key === 'search_dependency_risks'
  );

  it('accepts the official dependency risk number schema', () => {
    let result = dependencyRisksTool?.inputSchema.safeParse({
      projectKey: 'app',
      branch: 'main',
      pageIndex: 1.5,
      pageSize: 100.5
    });

    expect(result?.success).toBe(true);
  });
});
