# -*- coding: utf-8 -*-

import os.path
import sphinx_rtd_theme

# -------------------------------
# General
# -------------------------------

extensions = []
source_suffix = '.rst'
master_doc = 'index'
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

# -------------------------------
# Project
# -------------------------------

project = u'Meteor Azure'
copyright = u'2017, Talos Technology Pty Ltd'
version = u'2.0.0-rc.6'
release = u'2.0.0-rc.6'

# -------------------------------
# Internationalization
# -------------------------------

language = 'en'

# -------------------------------
# Output
# -------------------------------

# Use RTD theme
html_theme = "sphinx_rtd_theme"
html_theme_path = [sphinx_rtd_theme.get_html_theme_path()]

# Add custom styles
html_static_path = ['_static']
def setup(app):
    app.add_stylesheet('custom.css')
