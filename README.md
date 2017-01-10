# meteor-azure

Automate Meteor deployments on Azure App Service

### Prerequisites

1. Meteor 1.4+
2. App Service on Basic plan or higher
3. Following General Settings:
    * Web sockets - On
    * ARR Affinity - On
4. Following App Settings:
    * SCM_COMMAND_IDLE_TIMEOUT - 7200
    * METEOR_AZURE_NODE_VERSION - Node version bundled with your current Meteor release
    * METEOR_AZURE_NPM_VERSION - NPM version bundled with your current Meteor release
    * ROOT_URL - http://{sitename}.azurewebsites.net or a custom domain you've set up
    * MONGO_URL - MongoDB connection string
    * MONGO_OPLOG_URL - Optional: Recommended with multiple instances
    * METEOR_SETTINGS - Optional: e.g from your settings.json
    * METEOR_AZURE_ROOT - Optional: Path to your .meteor directory **IF** it's nested (format as "foo\bar\\")
    * METEOR_AZURE_NOCACHE - Optional: Set any value to enable (significantly slows down build)

### Setup instructions

1. Copy the contents of the ```script``` directory into the top-level of your repository
2. Configure a deployment source in the Azure portal ([detailed instructions](https://azure.microsoft.com/en-us/documentation/articles/app-service-continuous-deployment)) 

### Force HTTPS

Meteor's core [force-ssl](https://atmospherejs.com/meteor/force-ssl) package is incompatible with our setup. You can achieve the same functionality with an extra rewrite rule in your web.config (see a full example [here](https://raw.githubusercontent.com/talos-code/meteor-azure-example/master/.config/azure/web.config)):

```xml
<!-- Force HTTPS -->
<rule name="Redirect to HTTPS" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="^OFF$" />
  </conditions>
   <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

Note that with this approach ROOT_URL should be prefixed with 'https' (if not already)

### Example

See the [meteor-azure-example](https://github.com/talos-code/meteor-azure-example) repo
