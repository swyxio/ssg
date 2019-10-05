import * as fs from 'fs'
import * as path from 'path'
import chalk from 'chalk'
// @ts-ignore
import { Confirm, MultiSelect } from 'enquirer'
import {ensureDirectoryExistence} from './utils'

export async function ejectCommand() {
  const prompt = new MultiSelect({
    // initial:[0, 1], // we could set default files to pick but choosing not to for now
    name: 'files',
    message: 'Pick files to copy out! **Note: use <Space> to pick files, <i> to invert selection**',
    choices: [
      { name: '[ssgData].json.js', value: 'src/routes/data/[ssgData].json.js', hint: `ssg's default data route` },
      { name: 'template.html', value: 'src/template.html', hint: `sapper's template.html` },
      { name: 'rollup.config.js', value: 'rollup.config.js', hint: 'the fallback rollup config used in ssg' },
      { name: 'client.js', value: 'src/client.js', hint: `sapper's client.js` },
      { name: 'server.js', value: 'src/server.js', hint: `sapper's server.js` },
      { name: 'service-worker.js', value: 'src/service-worker.js', hint: `sapper's service-worker.js` },
      { name: 'netlify.toml', value: 'netlify.toml', hint: `Netlify deploy config file for ssg` },
      { name: 'error.svelte', value: 'src/routes/_error.svelte', hint: `(unused) error.svelte` },
      { name: 'layout.svelte', value: 'src/routes/_layout.svelte', hint: `(unused) layout.svelte` },
    ],
    result(names: any) {
      return this.map(names); // so we can actually get at the value
    }
  });
  // prompt.run().then(console.log)
  const selectedFiles: Record<string, string> = await prompt.run()
  const entries = Object.entries(selectedFiles)
  if (entries.length < 1) {
    console.warn('no files selected')
  }
  for (let arr of entries) {
    await eject(arr)
  }
}

async function eject([_sourceFile, destinationPath]: string[]) {
  const sourceFile = path.resolve(__dirname, '../ejectableFiles/' + _sourceFile)
  if (fs.existsSync(sourceFile)) {
    try {
      ensureDirectoryExistence(destinationPath)
      if (fs.existsSync(destinationPath)) {
        const prompt = new Confirm({
          name: 'question',
          message: `A file exists at ${chalk.cyan(destinationPath)}. Are you sure you want to overwrite? (y/N)`
        });
        const answer = await prompt.run()
        if (!answer) return // dont override
        try {
          fs.renameSync( destinationPath, destinationPath + '.old');
        } catch (err) {
          console.log('renaming failed. copying and overwriting instead.')
          fs.copyFileSync( destinationPath, destinationPath + '.copy');
        }
      }
      fs.copyFileSync(sourceFile, destinationPath);
      console.log(`${chalk.green('copied')} ${chalk.yellow(sourceFile)} to ${chalk.yellow(destinationPath)}`)
    } catch(err) {
      console.error('error copying file to ' + destinationPath)
    }
  } else {
    console.log(`file ${sourceFile} not found...`)
  }
}

