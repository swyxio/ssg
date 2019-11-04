// just reads the user's ssg config
const path = require('path');
const fs = require('fs');
const coreData = require('./dist/coreData').default;
const debug = require('debug')('ssg:readConfig');

// todo: actually use opts.ssgConfig
const configPath = path.resolve(process.cwd(), 'ssg.config.js');

debug('reading config');
let ssgConfig;
try {
  ssgConfig = require(configPath);
} catch (err) {
  ssgConfig = {};
}
const dotFolderPath = path.join('__sapper__', 'ssg');
const dotFolderDataPath = path.join(dotFolderPath, 'data.json');

let getDataSlice = async (key, uid) => {
  const plugins = ssgConfig.plugins;
  const coreDataPlugin = coreData(ssgConfig.coreDataOpts);
  coreDataPlugin.loadIndex(() =>
    JSON.parse(fs.readFileSync(dotFolderDataPath, 'utf8'))
  );
  if (key === 'ssgCoreData') {
    // specialcase handling for ssgCoreData
    return coreDataPlugin.getDataSlice(uid);
  }
  if (plugins) {
    if (plugins[key]) {
      return plugins[key].getDataSlice(uid, coreDataPlugin);
    }
  }
  if (ssgConfig.getDataSlice) {
    return ssgConfig.getDataSlice(key, uid);
  }
  // fallback
  throw new Error('no data found for key: ' + key + ' uid: ' + uid);
};
module.exports = {
  getDataSlice,
  getIndex
};
