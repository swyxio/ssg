import chokidar from 'chokidar'
import chalk from 'chalk'

/**
 *
 * take sapper's dev watcher, tack on a few more files to watch
 *
 */
export function watchSSGFiles(watcher: any) {
  let isReady = false
  const watchHandler = (event: string) => async (path: string) => {
    if (!path) {
      console.log('DEBUG SSG:', { event })
      return // skip undefined path
    }
    // bypass the initial 'add' events
    if (event === 'started') isReady = true
    else if (!isReady) return
    console.log(`${chalk.yellow.bold('SSG')}: ${chalk.blue(path)} changed. Reloading...`)
    watcher.restart(path, 'server')
  }
  // One-liner for current directory, ignores .dotfiles
  const chokiwatch = chokidar.watch(['ssg.config.js', 'content'])
  chokiwatch
    .on('add', watchHandler('added'))
    .on('change', watchHandler('changed'))
    .on('error', (error) => console.log(`chokiwatch error: ${error}`))
    .on('ready', watchHandler('started'))
}
