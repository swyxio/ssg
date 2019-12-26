import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { ensureDirectoryExistence } from './utils';
import coreData, { PluginOpts } from './coreData';
const debug = require('debug')('ssg:cli-ssg');
type Dict = Record<string, any>;
type SSGConfig = {
  /** space separated places to watch for reloads. default 'content' */
  watchFolders: string;
  configPath: string;
  plugins: Dict;
  createIndex(mainIndex: Dict): Promise<{ [key: string]: any }>;
  postExport: (index: { [key: string]: any }) => void;
  coreDataOpts: PluginOpts;
};

/**
 *
 * run getInitialData only once
 *
 */
export async function getSSGDataOnce(
  ssgConfig?: SSGConfig,
  sapperDir: string = process.cwd()
) {
  let mainIndex = {} as { [key: string]: any };

  /**
   * Add Core Markdown Data!
   */
  // TODO: understand input folder/file/glob
  // TODO: exempt ignored files
  debug('getting core data index');
  const coreDataPlugin = coreData(ssgConfig && ssgConfig.coreDataOpts);
  mainIndex.ssgCoreData = await coreDataPlugin.createIndex();

  /**
   * plugins
   */
  const plugins = ssgConfig && ssgConfig.plugins;
  if (plugins && plugins.ssgCoreData)
    throw new Error('plugin named ssgCoreData found, this is a reserved name');
  if (plugins) {
    // todo: parallelize
    for (let temp of Object.entries(plugins)) {
      const [pluginName, plugin] = temp;
      // note: order technically matters, but plugins supposed to be orthogonal
      mainIndex[pluginName] = await plugin.createIndex(mainIndex);
    }
  }

  debug('running ssg.config.js createIndex');
  if (ssgConfig && ssgConfig.createIndex) {
    mainIndex = await ssgConfig.createIndex(mainIndex);
  }
  const dotFolderPath = path.join(sapperDir, 'ssg');
  const dotFolderDataPath = path.join(dotFolderPath, 'data.json');
  ensureDirectoryExistence(dotFolderDataPath);
  if (!fs.existsSync(dotFolderPath)) fs.mkdirSync(dotFolderPath);
  debug('saving core data index');
  fs.writeFileSync(dotFolderDataPath, JSON.stringify(mainIndex));
  return mainIndex;
}

/**
 *
 * read ssg config and ensure defaults exist
 *
 */
export function readSSGConfig(ssgConfigPath: string): SSGConfig {
  let ssgConfig = {
    configPath: ssgConfigPath
  } as SSGConfig;
  if (!fs.existsSync(ssgConfigPath)) {
    console.warn(
      'ssgConfig file ' +
        ssgConfigPath +
        ' doesnt exist, continuing as regular sapper app'
    );
  } else {
    debug('reading ssg config');
    let _ssgConfig = require(path.resolve(ssgConfigPath));
    ssgConfig = {
      ...ssgConfig, // default to configpath
      watchFolders: 'content', // default to 'content'
      ..._ssgConfig // let user ssgconfig override everything
    };
  }
  return ssgConfig;
}

/**
 *
 * take sapper's dev watcher, tack on a few more files to watch
 *
 */
export function watchSSGFiles(watcher: any, ssgConfig: Partial<SSGConfig>) {
  let isReady = false;
  if (!ssgConfig.watchFolders) {
    debug('no ssg files to watch');
  } else {
    const watchHandler = (event: string) => async (path: string) => {
      // bypass the initial 'add' events
      if (event === 'started') isReady = true;
      else if (!isReady) return;

      // cue the restart message e.g. `content/color.yml changed. rebuilding...`
      watcher.restart(path, 'client'); // not sure if 'client'
      // get the frontend to live reload!
      watcher.dev_server.send({ action: 'reload' });
    };
    const filesToWatch = [
      ...ssgConfig.watchFolders!.split(' '),
      ssgConfig.configPath
    ].filter(Boolean) as string[];
    if (filesToWatch.length < 1) {
      console.log(
        'Warning: no SSG config or content files detected, operating as a basic Sapper app!'
      );
      return;
    }
    debug('watching ssg files');
    const chokiwatch = chokidar.watch(filesToWatch);
    chokiwatch
      .on('add', watchHandler('added'))
      .on('change', watchHandler('changed'))
      .on('error', (error) => console.log(`chokiwatch error: ${error}`))
      .on('ready', watchHandler('started'));
  }
}
