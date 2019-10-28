// just reads the user's ssg config
const path = require('path')
const fs = require('fs')
const coreData = require('./dist/coreData')

// todo: actually use opts.ssgConfig
const configPath = path.resolve(process.cwd(), 'ssg.config.js')

let getIndex = () => {
  throw new Error('no ssg.config.js given so no index available')
}
let getDataSlice = () => {
  throw new Error('no ssg.config.js given so no getDataSlice available')
}
if (fs.existsSync(configPath)) {
  console.log('ssg: reading config')
  const ssgConfig = require(configPath)
  const dotFolderPath = path.join('__sapper__', 'ssg')
  const dotFolderDataPath = path.join(dotFolderPath, 'data.json')
  getIndex = () => JSON.parse(fs.readFileSync(dotFolderDataPath, 'utf8'))

  getDataSlice = async (key, uid) => {
    const plugins = ssgConfig.plugins
    if (key === 'ssgCoreData') {
      // specialcase handling for ssgCoreData
      return coreData(ssgConfig.coreDataOpts).getDataSlice(uid)
    }
    if (plugins) {
      if (plugins[key]) {
        return plugins[key].getDataSlice(uid)
      }
    }
    if (ssgConfig.getDataSlice) {
      return ssgConfig.getDataSlice(key, uid)
    }
    // fallback
    throw new Error('no data found for key: ' + key + ' uid: ' + uid)
  }
}
module.exports = {
  getDataSlice,
  getIndex,
}
