import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient } from '../lib/client';
import { kubernetesServiceError } from '../lib/errors';
import { spec } from '../spec';

let ruleSchema = z.object({
  apiGroups: z.array(z.string()).describe('API groups (use "" for core group)'),
  resources: z.array(z.string()).describe('Resource types (e.g. "pods", "deployments")'),
  verbs: z
    .array(z.string())
    .describe('Allowed verbs (e.g. "get", "list", "create", "update", "delete", "watch")'),
  resourceNames: z.array(z.string()).optional().describe('Restrict to specific resource names')
});

let subjectSchema = z.object({
  subjectKind: z.enum(['User', 'Group', 'ServiceAccount']).describe('Type of subject'),
  subjectName: z.string().describe('Name of the subject'),
  subjectNamespace: z
    .string()
    .optional()
    .describe('Namespace (required for ServiceAccount subjects)')
});

export let manageRbac = SlateTool.create(spec, {
  name: 'Manage RBAC',
  key: 'manage_rbac',
  description: `Create or update RBAC resources: Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings.
Use this to define access control policies for users, groups, and service accounts.`,
  instructions: [
    'For Roles and RoleBindings, a namespace is required.',
    'For ClusterRoles and ClusterRoleBindings, namespace is ignored.',
    'When creating a binding, you must specify both the role reference and subjects.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Action to perform'),
      resourceKind: z
        .enum(['roles', 'clusterroles', 'rolebindings', 'clusterrolebindings'])
        .describe('RBAC resource type'),
      resourceName: z.string().describe('Name of the RBAC resource'),
      namespace: z
        .string()
        .optional()
        .describe('Namespace (required for Roles and RoleBindings)'),
      rules: z
        .array(ruleSchema)
        .optional()
        .describe('Permission rules (for Roles/ClusterRoles)'),
      roleRef: z
        .object({
          roleRefKind: z.enum(['Role', 'ClusterRole']).describe('Kind of role to reference'),
          roleRefName: z.string().describe('Name of the role to reference')
        })
        .optional()
        .describe('Role reference (for Bindings)'),
      subjects: z.array(subjectSchema).optional().describe('Subjects to bind to the role'),
      manifest: z.any().optional().describe('Full manifest. Overrides other fields.')
    })
  )
  .output(
    z.object({
      resourceName: z.string().describe('Name of the RBAC resource'),
      resourceKind: z.string().describe('Kind of RBAC resource'),
      resourceNamespace: z.string().optional().describe('Namespace'),
      rules: z.array(z.any()).optional().describe('Permission rules'),
      subjects: z.array(z.any()).optional().describe('Bound subjects'),
      roleRef: z.any().optional().describe('Referenced role')
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);
    let { action, resourceKind, resourceName, namespace } = ctx.input;
    let result: any;

    if (ctx.input.manifest) {
      if (action === 'create') {
        result = await client.createResource(resourceKind, ctx.input.manifest, namespace);
      } else {
        result = await client.applyResource(ctx.input.manifest, namespace);
      }
    } else if (resourceKind === 'roles' || resourceKind === 'clusterroles') {
      let kindMap: Record<string, string> = {
        roles: 'Role',
        clusterroles: 'ClusterRole'
      };
      let body: any = {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: kindMap[resourceKind],
        metadata: {
          name: resourceName
        },
        rules:
          ctx.input.rules?.map(r => ({
            apiGroups: r.apiGroups,
            resources: r.resources,
            verbs: r.verbs,
            resourceNames: r.resourceNames
          })) || []
      };

      if (action === 'create') {
        result = await client.createResource(resourceKind, body, namespace);
      } else {
        result = await client.applyResource(body, namespace);
      }
    } else {
      // bindings
      let kindMap: Record<string, string> = {
        rolebindings: 'RoleBinding',
        clusterrolebindings: 'ClusterRoleBinding'
      };
      if (!ctx.input.roleRef) {
        throw kubernetesServiceError('roleRef is required for creating/updating bindings');
      }
      let body: any = {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: kindMap[resourceKind],
        metadata: {
          name: resourceName
        },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: ctx.input.roleRef.roleRefKind,
          name: ctx.input.roleRef.roleRefName
        },
        subjects:
          ctx.input.subjects?.map(s => ({
            kind: s.subjectKind,
            name: s.subjectName,
            namespace: s.subjectNamespace,
            apiGroup: s.subjectKind === 'ServiceAccount' ? '' : 'rbac.authorization.k8s.io'
          })) || []
      };

      if (action === 'create') {
        result = await client.createResource(resourceKind, body, namespace);
      } else {
        result = await client.applyResource(body, namespace);
      }
    }

    return {
      output: {
        resourceName: result.metadata.name,
        resourceKind: result.kind,
        resourceNamespace: result.metadata.namespace,
        rules: result.rules,
        subjects: result.subjects,
        roleRef: result.roleRef
      },
      message: `Successfully ${action === 'create' ? 'created' : 'updated'} ${result.kind} **${result.metadata.name}**.`
    };
  })
  .build();
