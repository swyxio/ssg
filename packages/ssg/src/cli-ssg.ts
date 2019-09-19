import chokidar from 'chokidar'
import fs from 'fs'
import path from 'path'
type SSGConfig = {
  contentFolder: string
  ssgDotFolder: string
  configPath: string
  createIndex(): Promise<{ [key: string]: any }>
}

/**
 *
 * run getInitialData only once
 *
 */
export async function getSSGDataOnce(ssgConfig: SSGConfig) {
  if (ssgConfig.createIndex) {
    const mainIndex = await ssgConfig.createIndex()
    const dotFolderPath = path.resolve(ssgConfig.ssgDotFolder)
    const dotFolderDataPath = path.join(dotFolderPath, 'data.json')
    if (!fs.existsSync(dotFolderPath)) fs.mkdirSync(dotFolderPath)
    fs.writeFileSync(dotFolderDataPath, JSON.stringify(mainIndex))
  } else {
    console.warn('ssg warning: no createIndex in ssg.config.js detected, continuing as sapper app')
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
  ssgConfig.contentFolder = ssgConfig.contentFolder || 'content'
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
  const filesToWatch = [ssgConfig.contentFolder, ssgConfig.configPath].filter(Boolean) as string[]
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
