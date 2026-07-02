import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

export let manageVm = SlateTool.create(spec, {
  name: 'Manage Virtual Machine',
  key: 'manage_vm',
  description: `Perform lifecycle operations on a virtual machine: start, stop, modify (rename, resize), clone, reinstall OS, toggle auto-backup, change password, or boot from ISO media.`,
  instructions: [
    'vCPU and RAM can only be changed while the VM is stopped.',
    'Use "stop" with forceStop=true to force shutdown if graceful stop fails.',
    'Use "reinstall" to overwrite the current OS. Omit osName/osVersion to reinstall the same OS.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'start',
          'stop',
          'modify',
          'clone',
          'reinstall',
          'toggle_backup',
          'change_password',
          'boot_iso'
        ])
        .describe('Action to perform'),
      vmUuid: z.string().describe('UUID of the target virtual machine'),
      forceStop: z.boolean().optional().describe('Force stop the VM (only for "stop" action)'),
      name: z.string().optional().describe('New name (for "modify" or "clone")'),
      vcpu: z
        .number()
        .optional()
        .describe('New vCPU count (for "modify", VM must be stopped)'),
      ram: z.number().optional().describe('New RAM in MB (for "modify", VM must be stopped)'),
      osName: z.string().optional().describe('OS name for reinstall'),
      osVersion: z.string().optional().describe('OS version for reinstall'),
      username: z.string().optional().describe('Username for password change'),
      password: z.string().optional().describe('New password for password change'),
      bootImageUuid: z.string().optional().describe('ISO image UUID for boot_iso action'),
      bootImageRepository: z
        .enum(['private', 'platform'])
        .optional()
        .describe('ISO repository for boot_iso action')
    })
  )
  .output(
    z.object({
      vmUuid: z.string().describe('UUID of the affected VM'),
      name: z.string().optional().describe('VM name'),
      status: z.string().optional().describe('VM status after the action'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let { action, vmUuid } = ctx.input;
    let result: any;
    let message = '';

    switch (action) {
      case 'start':
        result = await client.startVm(vmUuid);
        message = `Started VM **${vmUuid}**.`;
        break;

      case 'stop':
        result = await client.stopVm(vmUuid, ctx.input.forceStop);
        message = `Stopped VM **${vmUuid}**${ctx.input.forceStop ? ' (forced)' : ''}.`;
        break;

      case 'modify':
        result = await client.modifyVm({
          vmUuid,
          name: ctx.input.name,
          vcpu: ctx.input.vcpu,
          ram: ctx.input.ram
        });
        message = `Modified VM **${vmUuid}**.`;
        break;

      case 'clone':
        result = await client.cloneVm(vmUuid, ctx.input.name || `clone-of-${vmUuid}`);
        message = `Cloned VM **${vmUuid}** as **${result?.name || ctx.input.name}**.`;
        break;

      case 'reinstall':
        result = await client.reinstallVm(vmUuid, ctx.input.osName, ctx.input.osVersion);
        message = `Reinstalled OS on VM **${vmUuid}**.`;
        break;

      case 'toggle_backup':
        result = await client.toggleAutoBackup(vmUuid);
        message = `Toggled auto-backup on VM **${vmUuid}**.`;
        break;

      case 'change_password':
        if (!ctx.input.username || !ctx.input.password) {
          throw new Error('username and password are required for change_password action');
        }
        result = await client.changeVmPassword(vmUuid, ctx.input.username, ctx.input.password);
        message = `Changed password for user **${ctx.input.username}** on VM **${vmUuid}**.`;
        break;

      case 'boot_iso':
        result = await client.bootIsoMedia(
          vmUuid,
          ctx.input.bootImageUuid,
          ctx.input.bootImageRepository
        );
        message = `Booted VM **${vmUuid}** from ISO media.`;
        break;
    }

    return {
      output: {
        vmUuid: result?.uuid || vmUuid,
        name: result?.name,
        status: result?.status,
        success: true
      },
      message
    };
  })
  .build();
