import chokidar  from 'chokidar'
import execa  from 'execa'
import chalk  from 'chalk'
import kill  from 'tree-kill'

let svelteProcess: any

// One-liner for current directory, ignores .dotfiles
const watcher = chokidar.watch(['ssg.config.js', 'content'])
watcher
  .on('add', watchHandler)
  .on('change', watchHandler)
  .on('error', (error) => console.log(`Watcher error: ${error}`))
  .on('ready', () => console.log('Initial scan complete. Ready for changes'))

async function watchHandler(path: string) {
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
