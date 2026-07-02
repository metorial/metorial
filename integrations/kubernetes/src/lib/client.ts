import { createAxios } from 'slates';

export interface KubeClientConfig {
  clusterUrl: string;
  token?: string;
  clientCertificate?: string;
  clientKey?: string;
  caCertificate?: string;
  namespace?: string;
  skipTlsVerify?: boolean;
}

export interface KubeListOptions {
  labelSelector?: string;
  fieldSelector?: string;
  limit?: number;
  continueToken?: string;
}

export interface KubeResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    uid?: string;
    resourceVersion?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    [key: string]: any;
  };
  spec?: Record<string, any>;
  status?: Record<string, any>;
  data?: Record<string, any>;
  [key: string]: any;
}

export interface KubeListResponse {
  apiVersion: string;
  kind: string;
  metadata: {
    resourceVersion?: string;
    continue?: string;
    [key: string]: any;
  };
  items: KubeResource[];
}

export interface KubeEvent {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    uid?: string;
    resourceVersion?: string;
    creationTimestamp?: string;
    [key: string]: any;
  };
  involvedObject?: {
    kind?: string;
    namespace?: string;
    name?: string;
    uid?: string;
    [key: string]: any;
  };
  reason?: string;
  message?: string;
  type?: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  count?: number;
  source?: Record<string, any>;
  [key: string]: any;
}

export let resourceApiPaths: Record<string, { apiBase: string; namespaced: boolean }> = {
  pods: { apiBase: '/api/v1', namespaced: true },
  services: { apiBase: '/api/v1', namespaced: true },
  configmaps: { apiBase: '/api/v1', namespaced: true },
  secrets: { apiBase: '/api/v1', namespaced: true },
  namespaces: { apiBase: '/api/v1', namespaced: false },
  nodes: { apiBase: '/api/v1', namespaced: false },
  persistentvolumes: { apiBase: '/api/v1', namespaced: false },
  persistentvolumeclaims: { apiBase: '/api/v1', namespaced: true },
  serviceaccounts: { apiBase: '/api/v1', namespaced: true },
  endpoints: { apiBase: '/api/v1', namespaced: true },
  events: { apiBase: '/api/v1', namespaced: true },
  resourcequotas: { apiBase: '/api/v1', namespaced: true },
  limitranges: { apiBase: '/api/v1', namespaced: true },
  replicationcontrollers: { apiBase: '/api/v1', namespaced: true },
  deployments: { apiBase: '/apis/apps/v1', namespaced: true },
  statefulsets: { apiBase: '/apis/apps/v1', namespaced: true },
  daemonsets: { apiBase: '/apis/apps/v1', namespaced: true },
  replicasets: { apiBase: '/apis/apps/v1', namespaced: true },
  jobs: { apiBase: '/apis/batch/v1', namespaced: true },
  cronjobs: { apiBase: '/apis/batch/v1', namespaced: true },
  ingresses: { apiBase: '/apis/networking.k8s.io/v1', namespaced: true },
  networkpolicies: { apiBase: '/apis/networking.k8s.io/v1', namespaced: true },
  roles: { apiBase: '/apis/rbac.authorization.k8s.io/v1', namespaced: true },
  clusterroles: { apiBase: '/apis/rbac.authorization.k8s.io/v1', namespaced: false },
  rolebindings: { apiBase: '/apis/rbac.authorization.k8s.io/v1', namespaced: true },
  clusterrolebindings: { apiBase: '/apis/rbac.authorization.k8s.io/v1', namespaced: false },
  horizontalpodautoscalers: { apiBase: '/apis/autoscaling/v2', namespaced: true },
  storageclasses: { apiBase: '/apis/storage.k8s.io/v1', namespaced: false },
  customresourcedefinitions: { apiBase: '/apis/apiextensions.k8s.io/v1', namespaced: false },
  endpointslices: { apiBase: '/apis/discovery.k8s.io/v1', namespaced: true },
  priorityclasses: { apiBase: '/apis/scheduling.k8s.io/v1', namespaced: false },
  leases: { apiBase: '/apis/coordination.k8s.io/v1', namespaced: true },
  mutatingwebhookconfigurations: {
    apiBase: '/apis/admissionregistration.k8s.io/v1',
    namespaced: false
  },
  validatingwebhookconfigurations: {
    apiBase: '/apis/admissionregistration.k8s.io/v1',
    namespaced: false
  }
};

export class KubeClient {
  private clusterUrl: string;
  private token: string;
  private defaultNamespace: string;
  private axios: ReturnType<typeof createAxios>;

  constructor(config: KubeClientConfig) {
    this.clusterUrl = config.clusterUrl.replace(/\/+$/, '');
    this.token = config.token || '';
    this.defaultNamespace = config.namespace || 'default';

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    this.axios = createAxios({
      baseURL: this.clusterUrl,
      headers
    });
  }

  private buildResourcePath(
    resourceType: string,
    namespace?: string,
    resourceName?: string
  ): string {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw new Error(
        `Unknown resource type: ${resourceType}. Supported types: ${Object.keys(resourceApiPaths).join(', ')}`
      );
    }

    let path = info.apiBase;
    if (info.namespaced && namespace) {
      path += `/namespaces/${namespace}`;
    }
    path += `/${rt}`;
    if (resourceName) {
      path += `/${resourceName}`;
    }
    return path;
  }

  private resolveNamespace(namespace?: string): string | undefined {
    return namespace || this.defaultNamespace;
  }

  async listResources(
    resourceType: string,
    options?: KubeListOptions & { namespace?: string }
  ): Promise<KubeListResponse> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw new Error(
        `Unknown resource type: ${resourceType}. Supported types: ${Object.keys(resourceApiPaths).join(', ')}`
      );
    }

    let ns = info.namespaced ? this.resolveNamespace(options?.namespace) : undefined;
    let path = this.buildResourcePath(rt, ns);

    let params: Record<string, string> = {};
    if (options?.labelSelector) params.labelSelector = options.labelSelector;
    if (options?.fieldSelector) params.fieldSelector = options.fieldSelector;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.continueToken) params.continue = options.continueToken;

    let response = await this.axios.get(path, { params });
    return response.data;
  }

  async getResource(
    resourceType: string,
    resourceName: string,
    namespace?: string
  ): Promise<KubeResource> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw new Error(
        `Unknown resource type: ${resourceType}. Supported types: ${Object.keys(resourceApiPaths).join(', ')}`
      );
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = this.buildResourcePath(rt, ns, resourceName);

    let response = await this.axios.get(path);
    return response.data;
  }

  async createResource(
    resourceType: string,
    body: Record<string, any>,
    namespace?: string
  ): Promise<KubeResource> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw new Error(
        `Unknown resource type: ${resourceType}. Supported types: ${Object.keys(resourceApiPaths).join(', ')}`
      );
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = this.buildResourcePath(rt, ns);

    let response = await this.axios.post(path, body);
    return response.data;
  }

  async updateResource(
    resourceType: string,
    resourceName: string,
    body: Record<string, any>,
    namespace?: string
  ): Promise<KubeResource> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw new Error(
        `Unknown resource type: ${resourceType}. Supported types: ${Object.keys(resourceApiPaths).join(', ')}`
      );
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = this.buildResourcePath(rt, ns, resourceName);

    let response = await this.axios.put(path, body);
    return response.data;
  }

  async patchResource(
    resourceType: string,
    resourceName: string,
    patch: Record<string, any>,
    namespace?: string,
    patchType: 'strategic' | 'merge' | 'json' = 'strategic'
  ): Promise<KubeResource> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw new Error(
        `Unknown resource type: ${resourceType}. Supported types: ${Object.keys(resourceApiPaths).join(', ')}`
      );
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = this.buildResourcePath(rt, ns, resourceName);

    let contentTypeMap = {
      strategic: 'application/strategic-merge-patch+json',
      merge: 'application/merge-patch+json',
      json: 'application/json-patch+json'
    };

    let response = await this.axios.patch(path, patch, {
      headers: { 'Content-Type': contentTypeMap[patchType] }
    });
    return response.data;
  }

  async deleteResource(
    resourceType: string,
    resourceName: string,
    namespace?: string,
    propagationPolicy?: string
  ): Promise<any> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw new Error(
        `Unknown resource type: ${resourceType}. Supported types: ${Object.keys(resourceApiPaths).join(', ')}`
      );
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = this.buildResourcePath(rt, ns, resourceName);

    let body: Record<string, any> | undefined;
    if (propagationPolicy) {
      body = { propagationPolicy };
    }

    let response = await this.axios.delete(path, { data: body });
    return response.data;
  }

  async getResourceScale(
    resourceType: string,
    resourceName: string,
    namespace?: string
  ): Promise<any> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw new Error(`Unknown resource type: ${resourceType}`);
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = `${this.buildResourcePath(rt, ns, resourceName)}/scale`;

    let response = await this.axios.get(path);
    return response.data;
  }

  async setResourceScale(
    resourceType: string,
    resourceName: string,
    replicas: number,
    namespace?: string
  ): Promise<any> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw new Error(`Unknown resource type: ${resourceType}`);
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = `${this.buildResourcePath(rt, ns, resourceName)}/scale`;

    let response = await this.axios.patch(
      path,
      {
        spec: { replicas }
      },
      {
        headers: { 'Content-Type': 'application/merge-patch+json' }
      }
    );
    return response.data;
  }

  async getResourceLogs(
    podName: string,
    namespace?: string,
    options?: {
      container?: string;
      tailLines?: number;
      sinceSeconds?: number;
      previous?: boolean;
    }
  ): Promise<string> {
    let ns = this.resolveNamespace(namespace);
    let path = `/api/v1/namespaces/${ns}/pods/${podName}/log`;

    let params: Record<string, string> = {};
    if (options?.container) params.container = options.container;
    if (options?.tailLines) params.tailLines = String(options.tailLines);
    if (options?.sinceSeconds) params.sinceSeconds = String(options.sinceSeconds);
    if (options?.previous) params.previous = 'true';

    let response = await this.axios.get(path, {
      params,
      headers: { Accept: 'text/plain' }
    });
    return response.data;
  }

  async restartDeployment(deploymentName: string, namespace?: string): Promise<KubeResource> {
    let ns = this.resolveNamespace(namespace);
    let path = this.buildResourcePath('deployments', ns, deploymentName);

    let now = new Date().toISOString();
    let response = await this.axios.patch(
      path,
      {
        spec: {
          template: {
            metadata: {
              annotations: {
                'kubectl.kubernetes.io/restartedAt': now
              }
            }
          }
        }
      },
      {
        headers: { 'Content-Type': 'application/strategic-merge-patch+json' }
      }
    );
    return response.data;
  }

  async listEvents(
    namespace?: string,
    options?: {
      fieldSelector?: string;
      limit?: number;
    }
  ): Promise<KubeListResponse> {
    let ns = this.resolveNamespace(namespace);
    let path = `/api/v1/namespaces/${ns}/events`;

    let params: Record<string, string> = {};
    if (options?.fieldSelector) params.fieldSelector = options.fieldSelector;
    if (options?.limit) params.limit = String(options.limit);

    let response = await this.axios.get(path, { params });
    return response.data;
  }

  async listClusterEvents(options?: {
    fieldSelector?: string;
    limit?: number;
    labelSelector?: string;
  }): Promise<KubeListResponse> {
    let path = `/api/v1/events`;

    let params: Record<string, string> = {};
    if (options?.fieldSelector) params.fieldSelector = options.fieldSelector;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.labelSelector) params.labelSelector = options.labelSelector;

    let response = await this.axios.get(path, { params });
    return response.data;
  }

  async getClusterInfo(): Promise<{
    version: any;
    nodeCount: number;
    nodes: any[];
  }> {
    let [versionResp, nodesResp] = await Promise.all([
      this.axios.get('/version'),
      this.axios.get('/api/v1/nodes')
    ]);

    let nodes = nodesResp.data.items || [];
    return {
      version: versionResp.data,
      nodeCount: nodes.length,
      nodes: nodes.map((n: any) => ({
        name: n.metadata?.name,
        status:
          n.status?.conditions?.find((c: any) => c.type === 'Ready')?.status === 'True'
            ? 'Ready'
            : 'NotReady',
        kubeletVersion: n.status?.nodeInfo?.kubeletVersion,
        osImage: n.status?.nodeInfo?.osImage,
        architecture: n.status?.nodeInfo?.architecture,
        capacity: n.status?.capacity,
        allocatable: n.status?.allocatable
      }))
    };
  }

  async getNamespaces(): Promise<KubeListResponse> {
    let response = await this.axios.get('/api/v1/namespaces');
    return response.data;
  }

  async applyResource(body: Record<string, any>, namespace?: string): Promise<KubeResource> {
    let kind = body.kind;
    let resourceType = kindToResourceType(kind);
    let name = body.metadata?.name;
    let info = resourceApiPaths[resourceType];
    if (!info) {
      throw new Error(`Unknown resource kind: ${kind}`);
    }

    let ns = info.namespaced
      ? body.metadata?.namespace || this.resolveNamespace(namespace)
      : undefined;

    try {
      let existing = await this.getResource(resourceType, name, ns);
      // Resource exists — update it
      body.metadata = body.metadata || {};
      body.metadata.resourceVersion = existing.metadata.resourceVersion;
      return await this.updateResource(resourceType, name, body, ns);
    } catch (e: any) {
      if (e?.response?.status === 404 || e?.status === 404) {
        return await this.createResource(resourceType, body, ns);
      }
      throw e;
    }
  }

  async getResourceStatus(
    resourceType: string,
    resourceName: string,
    namespace?: string
  ): Promise<any> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw new Error(`Unknown resource type: ${resourceType}`);
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = `${this.buildResourcePath(rt, ns, resourceName)}/status`;

    let response = await this.axios.get(path);
    return response.data;
  }
}

export let kindToResourceType = (kind: string): string => {
  let map: Record<string, string> = {
    Pod: 'pods',
    Service: 'services',
    ConfigMap: 'configmaps',
    Secret: 'secrets',
    Namespace: 'namespaces',
    Node: 'nodes',
    PersistentVolume: 'persistentvolumes',
    PersistentVolumeClaim: 'persistentvolumeclaims',
    ServiceAccount: 'serviceaccounts',
    Endpoints: 'endpoints',
    Event: 'events',
    ResourceQuota: 'resourcequotas',
    LimitRange: 'limitranges',
    ReplicationController: 'replicationcontrollers',
    Deployment: 'deployments',
    StatefulSet: 'statefulsets',
    DaemonSet: 'daemonsets',
    ReplicaSet: 'replicasets',
    Job: 'jobs',
    CronJob: 'cronjobs',
    Ingress: 'ingresses',
    NetworkPolicy: 'networkpolicies',
    Role: 'roles',
    ClusterRole: 'clusterroles',
    RoleBinding: 'rolebindings',
    ClusterRoleBinding: 'clusterrolebindings',
    HorizontalPodAutoscaler: 'horizontalpodautoscalers',
    StorageClass: 'storageclasses',
    CustomResourceDefinition: 'customresourcedefinitions',
    EndpointSlice: 'endpointslices',
    PriorityClass: 'priorityclasses',
    Lease: 'leases',
    MutatingWebhookConfiguration: 'mutatingwebhookconfigurations',
    ValidatingWebhookConfiguration: 'validatingwebhookconfigurations'
  };
  return map[kind] || `${kind.toLowerCase()}s`;
};

export let createKubeClient = (
  config: {
    clusterUrl: string;
    namespace?: string;
    skipTlsVerify?: boolean;
  },
  auth: {
    token?: string;
    clientCertificate?: string;
    clientKey?: string;
    caCertificate?: string;
  }
): KubeClient => {
  return new KubeClient({
    clusterUrl: config.clusterUrl,
    token: auth.token,
    clientCertificate: auth.clientCertificate,
    clientKey: auth.clientKey,
    caCertificate: auth.caCertificate,
    namespace: config.namespace,
    skipTlsVerify: config.skipTlsVerify
  });
};
