# meteor-azure

Git-based Meteor deployments on Azure App Service

## Prerequisites

1. Meteor 1.4+
2. App Service App with following App Settings:
    * MONGO_URL - (Mongo DB connection string from a MongoDB hosted on Mongo Lab or a VM)
    * ROOT_URL - http://{sitename}.azurewebsites.net or your custom domain if you've set that up
    * WEBSITE_NODE_DEFAULT_VERSION - Node version bundled with your current Meteor release
    * METEOR_SETTINGS - (Optional: Meteor app setting content from your settings.json) 

## Setup instructions

1. Copy the contents of the ```script``` directory into the root of your app
2. Configure a deployment source in the Azure portal ([detailed instructions](https://azure.microsoft.com/en-us/documentation/articles/app-service-continuous-deployment)) 

## Force HTTPS

Meteor's core [force-ssl](https://atmospherejs.com/meteor/force-ssl) package is incompatible with IIS. You can achieve the same functionality with a rewrite rule in your web.config:

```
<!-- Force HTTPS -->
<rule name="Redirect to HTTPS" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="^OFF$" />
  </conditions>
   <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

Note that with the approach above Meteor will not automatically set ROOT_URL to 'https' if specified incorrectly. 