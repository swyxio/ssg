import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { ensureDirectoryExistence } from './utils';
import coreData from './coreData';
const debug = require('debug')('ssg:cli-ssg')
type Dict = Record<string, any>;
type SSGConfig = {
  /** space separated places to watch for reloads. default 'content' */
  watchFolders: string;
  configPath: string;
  plugins: Dict;
  createIndex(mainIndex: Dict): Promise<{ [key: string]: any }>;
  postExport: (index: { [key: string]: any }) => void;
  coreDataOpts: any;
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
  const plugins = ssgConfig && ssgConfig.plugins;
  if (plugins && plugins.ssgCoreData)
    throw new Error('plugin named ssgCoreData found, this is a reserved name');
  if (plugins) {
    // todo: parallelize
    for (let temp of Object.entries(plugins)) {
      const [pluginName, plugin] = temp;
      mainIndex[pluginName] = await plugin.createIndex();
    }
  }

  /**
   * Add Core Markdown Data!
   */
  // TODO: understand input folder/file/glob
  // TODO: exempt ignored files
  debug('getting core data index')
  const coreDataPlugin = coreData(ssgConfig && ssgConfig.coreDataOpts);

  if (ssgConfig && ssgConfig.createIndex) {
    mainIndex = await ssgConfig.createIndex(mainIndex);
  }
  mainIndex.ssgCoreData = await coreDataPlugin.createIndex();
  const dotFolderPath = path.join(sapperDir, 'ssg');
  const dotFolderDataPath = path.join(dotFolderPath, 'data.json');
  ensureDirectoryExistence(dotFolderDataPath);
  if (!fs.existsSync(dotFolderPath)) fs.mkdirSync(dotFolderPath);
  debug('saving core data index')
  fs.writeFileSync(dotFolderDataPath, JSON.stringify(mainIndex));
  return mainIndex;

  // // idk if this is the best check...
  // if (Object.keys(mainIndex).length < 1) {
  //   console.warn('ssg warning: no index data from ssg plugins found, continuing as sapper app')
  //   return null
  // } else {
  //   return mainIndex
  // }
}

/**
 *
 * read ssg config and ensure defaults exist
 *
 */
export function readSSGConfig(ssgConfigPath: string): SSGConfig | undefined {
  if (!fs.existsSync(ssgConfigPath)) {
    console.warn(
      'ssgConfig file ' +
        ssgConfigPath +
        ' doesnt exist, continuing as regular sapper app'
    );
    return;
  }
  debug('reading ssg config')
  let ssgConfig = require(path.resolve(ssgConfigPath));
  ssgConfig.configPath = ssgConfigPath;
  ssgConfig.watchFolders = ssgConfig.watchFolders || 'content';
  return ssgConfig;
}

/**
 *
 * take sapper's dev watcher, tack on a few more files to watch
 *
 */
export function watchSSGFiles(watcher: any, ssgConfig: Partial<SSGConfig>) {
  let isReady = false;
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
  debug('watching ssg files')
  const chokiwatch = chokidar.watch(filesToWatch);
  chokiwatch
    .on('add', watchHandler('added'))
    .on('change', watchHandler('changed'))
    .on('error', error => console.log(`chokiwatch error: ${error}`))
    .on('ready', watchHandler('started'));
}
