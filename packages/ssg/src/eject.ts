import * as fs from 'fs'
import * as path from 'path'
import chalk from 'chalk'

export function eject([_sourceFile, destinationPath]: string[]) {
  const sourceFile = path.resolve(__dirname, '../ejectableFiles/' + _sourceFile)
  if (fs.existsSync(sourceFile)) {
    try {
      ensureDirectoryExistence(destinationPath)
      fs.copyFileSync(sourceFile, destinationPath);
      console.log(`${chalk.green('copied')} ${chalk.yellow(sourceFile)} to ${chalk.yellow(destinationPath)}`)
    } catch(err) {
      console.error('error copying file to ' + destinationPath)
    }
  } else {
    console.log(`file ${sourceFile} not found...`)
  }
}


function ensureDirectoryExistence(filePath: string) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
  return
}