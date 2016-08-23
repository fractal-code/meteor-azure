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
