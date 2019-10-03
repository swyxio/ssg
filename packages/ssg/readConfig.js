// just reads the user's ssg config
const path = require('path')
const fs = require('fs')

// todo: actually use opts.ssgConfig
const configPath = path.resolve(process.cwd(), 'ssg.config.js')
console.log('ssg: reading config')
const ssgConfig = require(configPath)
const dotFolderPath = path.resolve(ssgConfig.ssgDotFolder || '.ssg') // todo - resolve this properly
const dotFolderDataPath = path.join(dotFolderPath, 'data.json')
const getIndex = () => JSON.parse(fs.readFileSync(dotFolderDataPath, 'utf8'))

const getDataSlice = async (key, uid) => {
  const plugins = ssgConfig.plugins
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
module.exports = {
  getDataSlice,
  getIndex,
}
