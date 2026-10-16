# <img src="logo.svg" height="20"> Yandex

Manage Yandex Cloud virtual machines, disks, Object Storage buckets, serverless functions, IAM service accounts and API keys, VPC networks and subnets, DNS zones and records, clouds and folders, container registries, translation, and logging. Discover compute images, function versions, log groups, and asynchronous operation status.

Choose IAM authentication for infrastructure management. API keys support specific services and depend on scopes and validity periods. Start with `list_clouds` and `list_folders` to discover resource IDs. The legacy S3 bucket/object listings preserve their original raw responses; use `list_folder_buckets` for the IAM-authenticated bucket management API.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
