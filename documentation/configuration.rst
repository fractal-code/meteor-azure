=============
Configuration
=============

Meteor Azure is configured with a settings file and optionally, a custom web config.

Settings file
=============

Your settings file contains `Meteor.settings`_ and the Azure Web App details.

.. _Meteor.settings: https://docs.meteor.com/api/core.html#Meteor-settings

It follows the format below:

.. note:: All fields are requires unless otherwise specified

.. code-block:: javascript

    {
      "meteor-azure": {
        "siteName": "",
        "resourceGroup": "",
        "subscriptionId": "",
        "deploymentCreds": {
          "username": "",
          "password": ""
        },

        // e.g "something.onmicrosoft.com"
        // (can be read from the user dropdown in the portal)
        "tenantId": "",

        "envVariables": {
          "MONGO_URL": "",

          // "https://<siteName>.azurewebsites.net" or a custom domain if you have set one
          "ROOT_URL": ""

          // ... other environment variables e.g MONGO_OPLOG_URL, MAIL_URL, etc.
        },

        // An optional field for selecting deployment slot
        // (see below for full instructions)
        "slotName": "",

        // An optional field for enabling non-interactive login
        // (see below for full instructions)
        "servicePrincipal": {
          "appId": "",
          "secret": ""
        }
      }

      // ... keys for Meteor.settings
    }

Select deployment slot
----------------------

To target a particular deployment slot, set the "slotName" field to
the appropriate postfix and leave "siteName" as the base value.

For example: a deployment slot called "foo-bar-baz" where "foo-bar" is the
base value and "baz" is the slot postfix, would have:

.. code-block:: javascript

    {
      "siteName": "foo-bar",
      "slotName": "baz"
      // ...
    }

.. _setup-auto-cli-login:

Setup automatic CLI login
-------------------------

In scenarios where an interactive login is inconvenient/prohibiting (e.g on a CI server), we
can authenticate automatically by creating a service principal and granting resource access.

Follow the `Azure instructions`_ to configure this in the portal. Make sure to assign
a "Contributor" role within the current subscription, and take note of your
key value (which is the "secret") and application ID.

Add these details to the "servicePrincipal" field and try running the CLI again. You should
no longer be prompted for login.

.. _Azure instructions: https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal


Custom web config
=================

The web config is used to configure your IIS web server in Azure. The `default values`_ provide
a good starting point for most applications.

.. _default values: https://raw.githubusercontent.com/fractal-code/meteor-azure-server-init/master/web.config

Some common use cases for a custom file (using the ``--web-config`` option) are described below.

We also have a `repository of examples`_ that you can browse through.

.. _repository of examples: https://github.com/fractal-code/meteor-azure-web-config/tree/master/samples

.. _setup-https-redirect:

Setup HTTPS redirect
--------------------

.. note:: We do not support the core 'force-ssl' package

To handle redirecting users to HTTPS, add an extra rewrite rule (preceding existing rules) and
ensure your "ROOT_URL" is given with "https":

.. code-block:: xml

    <rewrite>
      <rules>
        <!-- Force HTTPS -->
        <rule name="Redirect to HTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{HTTPS}" pattern="^OFF$" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>

        <!-- ... other rewrite rules -->
      </rules>
    </rewrite>

.. _enable-multi-core:

Enable multi-core
-----------------

To fully utilise CPU capacity on multi-core servers (offered by the `larger instances`_), we can
load balance between multiple processes of our application on each machine.

.. _larger instances: https://azure.microsoft.com/en-us/pricing/details/app-service

This is handled automatically by the IISNode module, and can be enabled by setting
the "nodeProcessCountPerApplication" option:

.. code-block:: xml

    <system.webServer>
      <!-- ... -->

      <!-- specify number of node processes to be started, setting this to 0
           will result in creating one process per each processor on the machine -->
      <iisnode nodeProcessCountPerApplication="0" />
    </system.webServer>
