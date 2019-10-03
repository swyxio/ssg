// just reads the user's ssg config
const path = require('path')
const configPath = path.resolve(process.cwd(), 'ssg.config.js')
console.log('ssg: reading config')
const { getDataSlice, getIndex } = require(configPath)
module.exports = {
  getDataSlice,
  getIndex,
}
