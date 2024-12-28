#!/usr/bin/env python3

# Replaces the manifest file from the current setup, pulling the new setup from
# manifest_firefox.json or manifest_chrome.json, and throwing the current manifest file into one of these backups
# This script works on linux

import os.path

isOnChrome = os.path.isfile("./extension_files/manifest_firefox.json");

if isOnChrome:
  os.rename('./extension_files/manifest.json', './extension_files/manifest_chrome.json')
  os.rename('./extension_files/manifest_firefox.json', './extension_files/manifest.json')
else:
  os.rename('./extension_files/manifest.json', './extension_files/manifest_firefox.json')
  os.rename('./extension_files/manifest_chrome.json', './extension_files/manifest.json')
