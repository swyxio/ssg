import chokidar  from 'chokidar'
import execa  from 'execa'
import chalk  from 'chalk'
import kill  from 'tree-kill'

let svelteProcess: any
let isReady = false


const watchHandler = (event: string) => async (path: string) =>  {
  // bypass the initial 'add' events
  if (event === 'started') isReady = true
  else if (!isReady) return

  // main of the handler
  if (svelteProcess) {
    console.log(`${chalk.yellow.bold('SSG')}: ${chalk.blue('ssg.config.js')} changed. Reloading...`)
    kill(svelteProcess.pid) // need to tree-kill bc child of child
  }
  try {
    svelteProcess = execa('sapper', ['dev', '--ext', '.svexy .svelte'])
    await svelteProcess.stdout.pipe(process.stdout)
  } catch (err) {
    console.error(err)
  }
}


// One-liner for current directory, ignores .dotfiles
const watcher = chokidar.watch(['ssg.config.js', 'content'])
watcher
  .on('add', watchHandler('added'))
  .on('change', watchHandler('changed'))
  .on('error', (error) => console.log(`Watcher error: ${error}`))
  .on('ready', watchHandler('started'))
