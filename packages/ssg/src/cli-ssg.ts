import chokidar from 'chokidar'
import fs from 'fs'
import path from 'path'
type Dict = Record<string, any>
type SSGConfig = {
  /** space separated places to watch for reloads. default 'content' */
  watchFolders: string
  /** where to store ssg index data. default '.ssg' */
  ssgDotFolder: string
  configPath: string
  plugins: Dict
  createIndex(mainIndex: Dict): Promise<{ [key: string]: any }>
  postExport: (index: { [key: string]: any }) => void
}

/**
 *
 * run getInitialData only once
 *
 */
export async function getSSGDataOnce(ssgConfig: SSGConfig) {
  let mainIndex = {}
  const plugins = ssgConfig.plugins
  if (plugins) {
    Object.entries(plugins).forEach(([pluginName,plugin]) => {
      mainIndex[pluginName] = plugin.createIndex()
    })
  }
  
  if (ssgConfig.createIndex) {
    mainIndex = await ssgConfig.createIndex(mainIndex)
    const dotFolderPath = path.resolve(ssgConfig.ssgDotFolder)
    const dotFolderDataPath = path.join(dotFolderPath, 'data.json')
    if (!fs.existsSync(dotFolderPath)) fs.mkdirSync(dotFolderPath)
    fs.writeFileSync(dotFolderDataPath, JSON.stringify(mainIndex))
    return mainIndex
  } 

  // idk if this is the best check...
  if (Object.keys(mainIndex).length < 1) {
    console.warn('ssg warning: no index data from ssg plugins found, continuing as sapper app')
    return null
  } else {
    return mainIndex
  }
}

/**
 *
 * read ssg config and ensure defaults exist
 *
 */
export function readSSGConfig(ssgConfigPath: string): SSGConfig {
  if (!fs.existsSync(ssgConfigPath)) throw new Error('ssgConfig file ' + ssgConfigPath + ' missing')
  let ssgConfig = require(path.resolve(ssgConfigPath))
  ssgConfig.configPath = ssgConfigPath
  ssgConfig.ssgDotFolder = ssgConfig.ssgDotFolder || '.ssg'
  ssgConfig.watchFolders = ssgConfig.watchFolders || 'content'
  return ssgConfig
}

/**
 *
 * take sapper's dev watcher, tack on a few more files to watch
 *
 */
export function watchSSGFiles(watcher: any, ssgConfig: Partial<SSGConfig>) {
  let isReady = false
  const watchHandler = (event: string) => async (path: string) => {
    // bypass the initial 'add' events
    if (event === 'started') isReady = true
    else if (!isReady) return

    // cue the restart message e.g. `content/color.yml changed. rebuilding...`
    watcher.restart(path, 'client') // not sure if 'client'
    // get the frontend to live reload!
    watcher.dev_server.send({ action: 'reload' })
  }
  const filesToWatch = [...ssgConfig.watchFolders!.split(' '), ssgConfig.configPath].filter(Boolean) as string[]
  if (filesToWatch.length < 1) {
    console.log('Warning: no SSG config or content files detected, operating as a basic Sapper app!')
    return
  }
  const chokiwatch = chokidar.watch(filesToWatch)
  chokiwatch
    .on('add', watchHandler('added'))
    .on('change', watchHandler('changed'))
    .on('error', (error) => console.log(`chokiwatch error: ${error}`))
    .on('ready', watchHandler('started'))
}
