============
Installation
============

Meteor Azure is available as an NPM package on Linux, macOS and Windows. You can choose to install
globally or locally, depending on your requirements.

Prerequisites
=============

- Node >=4 is necessary to run the CLI

- Meteor >=1.4 is necessary to build your application (along with a basic compiler toolchain
  `if you have binary dependencies`_)

.. _if you have binary dependencies: https://guide.meteor.com/v1.4/1.4-migration.html#binary-packages-require-build-toolchain

Global usage
============

Installing globally will make the tool available to any project on your machine. While this is convenient,
it comes at the expense of portability and less control over versioning.

.. code-block:: bash

    $ npm install -g meteor-azure

After installation, simply run ``meteor-azure`` from any command line to start using it.

Local usage
===========

Installing locally will make the tool available to your current project. This is particularly useful when
you want to automate deployments for an external process (e.g continuous integration).

.. code-block:: bash

    $ npm install meteor-azure --save-dev

After installation, you can start using it by running ``./node_modules/.bin/meteor-azure`` in the project
directory or adding a script to your package.json file:

.. code-block:: json
    :emphasize-lines: 4

    {
      "name": "my-project",
      "scripts": {
        "deploy": "meteor-azure"
      }
    }
