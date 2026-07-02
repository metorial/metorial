import { createAxios } from 'slates';

export class JenkinsClient {
  private axios: ReturnType<typeof createAxios>;
  private baseUrl: string;

  constructor(config: { instanceUrl: string; username: string; token: string }) {
    this.baseUrl = config.instanceUrl.replace(/\/+$/, '');
    this.axios = createAxios({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Basic ${btoa(`${config.username}:${config.token}`)}`
      }
    });
  }

  private jobPath(jobPath: string): string {
    // Convert a job path like "folder/subfolder/jobName" to Jenkins URL path "/job/folder/job/subfolder/job/jobName"
    let parts = jobPath.split('/').filter(p => p.length > 0);
    return parts.map(p => `/job/${encodeURIComponent(p)}`).join('');
  }

  // ==================== CSRF Crumb ====================

  async getCrumb(): Promise<{ crumbField: string; crumb: string } | null> {
    try {
      let response = await this.axios.get('/crumbIssuer/api/json');
      return {
        crumbField: response.data.crumbRequestField,
        crumb: response.data.crumb
      };
    } catch {
      return null;
    }
  }

  private async postWithCrumb(url: string, data?: any, config?: any): Promise<any> {
    let crumb = await this.getCrumb();
    let headers: Record<string, string> = { ...(config?.headers || {}) };
    if (crumb) {
      headers[crumb.crumbField] = crumb.crumb;
    }
    return this.axios.post(url, data, { ...config, headers });
  }

  // ==================== Jobs ====================

  async listJobs(options?: { folderPath?: string; nameFilter?: string }): Promise<any[]> {
    let path = options?.folderPath ? this.jobPath(options.folderPath) : '';
    let response = await this.axios.get(`${path}/api/json`, {
      params: { tree: 'jobs[name,url,color,description,fullName,buildable]' }
    });
    let jobs = response.data.jobs || [];
    if (options?.nameFilter) {
      let filter = options.nameFilter.toLowerCase();
      jobs = jobs.filter((j: any) => j.name.toLowerCase().includes(filter));
    }
    return jobs;
  }

  async getJob(jobPath: string): Promise<any> {
    let response = await this.axios.get(`${this.jobPath(jobPath)}/api/json`);
    return response.data;
  }

  async getJobConfig(jobPath: string): Promise<string> {
    let response = await this.axios.get(`${this.jobPath(jobPath)}/config.xml`);
    return response.data;
  }

  async createJob(name: string, xmlConfig: string, folderPath?: string): Promise<void> {
    let path = folderPath ? this.jobPath(folderPath) : '';
    await this.postWithCrumb(`${path}/createItem`, xmlConfig, {
      params: { name },
      headers: { 'Content-Type': 'application/xml' }
    });
  }

  async updateJobConfig(jobPath: string, xmlConfig: string): Promise<void> {
    await this.postWithCrumb(`${this.jobPath(jobPath)}/config.xml`, xmlConfig, {
      headers: { 'Content-Type': 'application/xml' }
    });
  }

  async deleteJob(jobPath: string): Promise<void> {
    await this.postWithCrumb(`${this.jobPath(jobPath)}/doDelete`);
  }

  async copyJob(sourceName: string, newName: string, folderPath?: string): Promise<void> {
    let path = folderPath ? this.jobPath(folderPath) : '';
    await this.postWithCrumb(`${path}/createItem`, null, {
      params: { name: newName, mode: 'copy', from: sourceName },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  async enableJob(jobPath: string): Promise<void> {
    await this.postWithCrumb(`${this.jobPath(jobPath)}/enable`);
  }

  async disableJob(jobPath: string): Promise<void> {
    await this.postWithCrumb(`${this.jobPath(jobPath)}/disable`);
  }

  // ==================== Builds ====================

  async triggerBuild(
    jobPath: string,
    parameters?: Record<string, string>
  ): Promise<{ queueUrl: string | null }> {
    let endpoint: string;
    let data: string | undefined;
    let headers: Record<string, string> = {};

    if (parameters && Object.keys(parameters).length > 0) {
      endpoint = `${this.jobPath(jobPath)}/buildWithParameters`;
      let params = new URLSearchParams();
      for (let [key, value] of Object.entries(parameters)) {
        params.append(key, value);
      }
      data = params.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      endpoint = `${this.jobPath(jobPath)}/build`;
    }

    let response = await this.postWithCrumb(endpoint, data, { headers });
    let queueUrl = response.headers?.location || null;
    return { queueUrl };
  }

  async getBuild(jobPath: string, buildNumber: number | string): Promise<any> {
    let response = await this.axios.get(`${this.jobPath(jobPath)}/${buildNumber}/api/json`);
    return response.data;
  }

  async getLastBuild(jobPath: string): Promise<any> {
    let response = await this.axios.get(`${this.jobPath(jobPath)}/lastBuild/api/json`);
    return response.data;
  }

  async getConsoleOutput(jobPath: string, buildNumber: number | string): Promise<string> {
    let response = await this.axios.get(`${this.jobPath(jobPath)}/${buildNumber}/consoleText`);
    return response.data;
  }

  async stopBuild(jobPath: string, buildNumber: number | string): Promise<void> {
    await this.postWithCrumb(`${this.jobPath(jobPath)}/${buildNumber}/stop`);
  }

  async terminateBuild(jobPath: string, buildNumber: number | string): Promise<void> {
    await this.postWithCrumb(`${this.jobPath(jobPath)}/${buildNumber}/term`);
  }

  async killBuild(jobPath: string, buildNumber: number | string): Promise<void> {
    await this.postWithCrumb(`${this.jobPath(jobPath)}/${buildNumber}/kill`);
  }

  async getBuildTestResults(jobPath: string, buildNumber: number | string): Promise<any> {
    try {
      let response = await this.axios.get(
        `${this.jobPath(jobPath)}/${buildNumber}/testReport/api/json`
      );
      return response.data;
    } catch {
      return null;
    }
  }

  async getBuilds(jobPath: string, limit: number = 10): Promise<any[]> {
    let response = await this.axios.get(`${this.jobPath(jobPath)}/api/json`, {
      params: {
        tree: `builds[number,url,result,timestamp,duration,displayName,building,description]{0,${limit}}`
      }
    });
    return response.data.builds || [];
  }

  // ==================== Queue ====================

  async getQueue(): Promise<any> {
    let response = await this.axios.get('/queue/api/json');
    return response.data;
  }

  async getQueueItem(itemId: number): Promise<any> {
    let response = await this.axios.get(`/queue/item/${itemId}/api/json`);
    return response.data;
  }

  async cancelQueueItem(itemId: number): Promise<void> {
    await this.postWithCrumb(`/queue/cancelItem`, null, {
      params: { id: itemId }
    });
  }

  // ==================== Views ====================

  async listViews(): Promise<any[]> {
    let response = await this.axios.get('/api/json', {
      params: { tree: 'views[name,url,description]' }
    });
    return response.data.views || [];
  }

  async getView(viewName: string): Promise<any> {
    let response = await this.axios.get(`/view/${encodeURIComponent(viewName)}/api/json`);
    return response.data;
  }

  async getViewConfig(viewName: string): Promise<string> {
    let response = await this.axios.get(`/view/${encodeURIComponent(viewName)}/config.xml`);
    return response.data;
  }

  async createView(name: string, xmlConfig: string): Promise<void> {
    await this.postWithCrumb('/createView', xmlConfig, {
      params: { name },
      headers: { 'Content-Type': 'application/xml' }
    });
  }

  async updateViewConfig(viewName: string, xmlConfig: string): Promise<void> {
    await this.postWithCrumb(`/view/${encodeURIComponent(viewName)}/config.xml`, xmlConfig, {
      headers: { 'Content-Type': 'application/xml' }
    });
  }

  async deleteView(viewName: string): Promise<void> {
    await this.postWithCrumb(`/view/${encodeURIComponent(viewName)}/doDelete`);
  }

  async addJobToView(viewName: string, jobName: string): Promise<void> {
    await this.postWithCrumb(`/view/${encodeURIComponent(viewName)}/addJobToView`, null, {
      params: { name: jobName }
    });
  }

  async removeJobFromView(viewName: string, jobName: string): Promise<void> {
    await this.postWithCrumb(`/view/${encodeURIComponent(viewName)}/removeJobFromView`, null, {
      params: { name: jobName }
    });
  }

  // ==================== Nodes ====================

  async listNodes(): Promise<any> {
    let response = await this.axios.get('/computer/api/json');
    return response.data;
  }

  async getNode(nodeName: string): Promise<any> {
    let name = nodeName === 'master' || nodeName === '(master)' ? '(master)' : nodeName;
    let response = await this.axios.get(`/computer/${encodeURIComponent(name)}/api/json`);
    return response.data;
  }

  async createNode(
    name: string,
    options: {
      description?: string;
      remoteFs?: string;
      numExecutors?: number;
      labels?: string;
      launcher?: string;
    }
  ): Promise<void> {
    let nodeConfig = {
      name,
      nodeDescription: options.description || '',
      numExecutors: options.numExecutors || 1,
      remoteFS: options.remoteFs || '/var/jenkins',
      labelString: options.labels || '',
      mode: 'NORMAL',
      retentionStrategy: { 'stapler-class': 'hudson.slaves.RetentionStrategy$Always' },
      nodeProperties: { 'stapler-class-bag': 'true' },
      launcher: {
        'stapler-class': options.launcher || 'hudson.slaves.JNLPLauncher'
      },
      type: 'hudson.slaves.DumbSlave$DescriptorImpl'
    };

    await this.postWithCrumb('/computer/doCreateItem', null, {
      params: {
        name,
        type: 'hudson.slaves.DumbSlave$DescriptorImpl',
        json: JSON.stringify(nodeConfig)
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  async deleteNode(nodeName: string): Promise<void> {
    await this.postWithCrumb(`/computer/${encodeURIComponent(nodeName)}/doDelete`);
  }

  async toggleNodeOffline(
    nodeName: string,
    offline: boolean,
    message?: string
  ): Promise<void> {
    let name = nodeName === 'master' || nodeName === '(master)' ? '(master)' : nodeName;
    let endpoint = offline ? 'toggleOffline' : 'toggleOffline';
    await this.postWithCrumb(`/computer/${encodeURIComponent(name)}/${endpoint}`, null, {
      params: { offlineMessage: message || '' }
    });
  }

  // ==================== Plugins ====================

  async listPlugins(depth?: number): Promise<any> {
    let response = await this.axios.get('/pluginManager/api/json', {
      params: { depth: depth || 1 }
    });
    return response.data;
  }

  async installPlugin(pluginId: string): Promise<void> {
    let xml = `<jenkins><install plugin="${pluginId}@latest" /></jenkins>`;
    await this.postWithCrumb('/pluginManager/installNecessaryPlugins', xml, {
      headers: { 'Content-Type': 'application/xml' }
    });
  }

  // ==================== Credentials ====================

  async listCredentials(domain?: string, folderPath?: string): Promise<any> {
    let basePath = folderPath ? this.jobPath(folderPath) : '';
    let domainPath = domain || '_';
    let response = await this.axios.get(
      `${basePath}/credentials/store/system/domain/${domainPath}/api/json`,
      { params: { depth: 1 } }
    );
    return response.data;
  }

  async getCredential(
    credentialId: string,
    domain?: string,
    folderPath?: string
  ): Promise<any> {
    let basePath = folderPath ? this.jobPath(folderPath) : '';
    let domainPath = domain || '_';
    let response = await this.axios.get(
      `${basePath}/credentials/store/system/domain/${domainPath}/credential/${credentialId}/api/json`
    );
    return response.data;
  }

  async getCredentialConfig(
    credentialId: string,
    domain?: string,
    folderPath?: string
  ): Promise<string> {
    let basePath = folderPath ? this.jobPath(folderPath) : '';
    let domainPath = domain || '_';
    let response = await this.axios.get(
      `${basePath}/credentials/store/system/domain/${domainPath}/credential/${credentialId}/config.xml`
    );
    return response.data;
  }

  async createCredential(
    xmlConfig: string,
    domain?: string,
    folderPath?: string
  ): Promise<void> {
    let basePath = folderPath ? this.jobPath(folderPath) : '';
    let domainPath = domain || '_';
    await this.postWithCrumb(
      `${basePath}/credentials/store/system/domain/${domainPath}/createCredentials`,
      xmlConfig,
      { headers: { 'Content-Type': 'application/xml' } }
    );
  }

  async updateCredential(
    credentialId: string,
    xmlConfig: string,
    domain?: string,
    folderPath?: string
  ): Promise<void> {
    let basePath = folderPath ? this.jobPath(folderPath) : '';
    let domainPath = domain || '_';
    await this.postWithCrumb(
      `${basePath}/credentials/store/system/domain/${domainPath}/credential/${credentialId}/config.xml`,
      xmlConfig,
      { headers: { 'Content-Type': 'application/xml' } }
    );
  }

  async deleteCredential(
    credentialId: string,
    domain?: string,
    folderPath?: string
  ): Promise<void> {
    let basePath = folderPath ? this.jobPath(folderPath) : '';
    let domainPath = domain || '_';
    await this.postWithCrumb(
      `${basePath}/credentials/store/system/domain/${domainPath}/credential/${credentialId}/doDelete`
    );
  }

  // ==================== System ====================

  async getSystemInfo(): Promise<any> {
    let response = await this.axios.get('/api/json');
    return response.data;
  }

  async whoAmI(): Promise<any> {
    let response = await this.axios.get('/me/api/json');
    return response.data;
  }

  async executeScript(script: string, nodeName?: string): Promise<string> {
    let endpoint = nodeName
      ? `/computer/${encodeURIComponent(nodeName)}/scriptText`
      : '/scriptText';
    let params = new URLSearchParams();
    params.append('script', script);
    let response = await this.postWithCrumb(endpoint, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  // ==================== Folders ====================

  async createFolder(name: string, parentPath?: string): Promise<void> {
    let path = parentPath ? this.jobPath(parentPath) : '';
    let formData = new URLSearchParams();
    formData.append('name', name);
    formData.append('mode', 'com.cloudbees.hudson.plugins.folder.Folder');
    formData.append('from', '');
    formData.append(
      'json',
      JSON.stringify({ name, mode: 'com.cloudbees.hudson.plugins.folder.Folder', from: '' })
    );
    await this.postWithCrumb(`${path}/createItem`, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }
}
