========
Overview
========

Meteor Azure is a command line tool for deploying `Meteor`_ applications on `Azure App Service`_.

The project is designed with an emphasis on simple configuration out-of-the-box, with extensive
customisation for advanced usage.

Read the :doc:`tutorial <getting-started>` to get started, and report any issues or questions on our `GitHub repo`_.

.. _Meteor: https://meteor.com
.. _Azure App Service: https://azure.microsoft.com/en-us/services/app-service/
.. _Github repo: https://github.com/fractal-code/meteor-azure

CLI Features
============

- Cross platform (macOS, Linux and Windows)
- One command deploy
- Load Meteor settings from file
- Auto-detect correct Node/NPM versions
- Track deployment progress in real-time
- Use custom web config

Azure platform benefits
=======================

- Auto-scaling
- Zero-downtime deployment
- High availability (with `99.95% SLA`_)
- `34 regions`_ around the world
- Dedicated VMs
- Multi-core session affinity
- Configure advanced architectures (e.g multi-region failover)
- Security compliance (ISO, SOC and PCI)

.. _99.95% SLA: https://azure.microsoft.com/en-us/support/legal/sla/app-service/v1_4
.. _34 regions: https://azure.microsoft.com/en-us/regions

.. toctree::
    :hidden:

    self
    installation
    getting-started
    configuration
    command-line-options
    further-reading
