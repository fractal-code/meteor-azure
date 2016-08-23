# meteor-azure

Git-based Meteor deployments on Azure App Service

## Prerequisites

1. Meteor 1.4+
2. App Service with following App Settings:
    * MONGO_URL - (MongoDB connection string)
    * ROOT_URL - http://{sitename}.azurewebsites.net or your custom domain if you've set that up
    * WEBSITE_NODE_DEFAULT_VERSION - (Node version bundled with your current Meteor release)
    * METEOR_SETTINGS - (Optional: Meteor app setting content e.g from your settings.json) 

## Setup instructions

1. Copy the contents of the ```script``` directory into the top-level of your repository
2. Configure a deployment source in the Azure portal ([detailed instructions](https://azure.microsoft.com/en-us/documentation/articles/app-service-continuous-deployment)) 

## Force HTTPS

Meteor's core [force-ssl](https://atmospherejs.com/meteor/force-ssl) package is incompatible with IIS. You can achieve the same functionality with a rewrite rule in your web.config:

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

Note that with this approach Meteor will not automatically set ROOT_URL to 'https' if specified falsely.
