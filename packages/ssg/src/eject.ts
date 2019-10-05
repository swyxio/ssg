import * as fs from 'fs'
import * as path from 'path'



export function eject([_sourceFile, destinationPath]: string[]) {
  const sourceFile = path.resolve(__dirname, '../ejectableFiles/' + _sourceFile)
  if (fs.existsSync(sourceFile)) {
    console.log({sourceFile, destinationPath})
    try {
      ensureDirectoryExistence(destinationPath)
      fs.copyFileSync(sourceFile, destinationPath);
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