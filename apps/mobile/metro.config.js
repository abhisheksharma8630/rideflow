// Metro config tuned for an npm-workspaces monorepo.
// Watches the repo root so shared changes are picked up, and resolves modules
// from both the app and the hoisted root node_modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Prefer the app's own copy of a package when both exist (avoids version clashes).
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
