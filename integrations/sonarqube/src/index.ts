import { Slate } from 'slates';
import { spec } from './spec';
import {
  getDuplicationsTool,
  getFileCoverageDetailsTool,
  getHotspotTool,
  getProjectMeasuresTool,
  getQualityGateStatusTool,
  getRuleTool,
  getScmInfoTool,
  getSourceTool,
  getSystemStatusTool,
  listLanguagesTool,
  listMetricsTool,
  listProjectBranchesTool,
  listProjectPullRequestsTool,
  listQualityGatesTool,
  manageHotspotTool,
  manageIssueTool,
  runAdvancedCodeAnalysisTool,
  searchDependencyRisksTool,
  searchDuplicatedFilesTool,
  searchFilesByCoverageTool,
  searchHotspotsTool,
  searchIssuesTool,
  searchProjectsTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    searchProjectsTool,
    listProjectBranchesTool,
    listProjectPullRequestsTool,
    listMetricsTool,
    getProjectMeasuresTool,
    searchFilesByCoverageTool,
    getFileCoverageDetailsTool,
    getQualityGateStatusTool,
    listQualityGatesTool,
    listLanguagesTool,
    getSystemStatusTool,
    searchIssuesTool,
    manageIssueTool,
    runAdvancedCodeAnalysisTool,
    searchDependencyRisksTool,
    searchHotspotsTool,
    getHotspotTool,
    manageHotspotTool,
    getRuleTool,
    getSourceTool,
    getScmInfoTool,
    searchDuplicatedFilesTool,
    getDuplicationsTool
  ],
  triggers: []
});
