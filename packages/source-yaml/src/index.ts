const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
// const slugify = require('@sindresorhus/slugify')

const { promisify } = require('util')
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
// const lstat = promisify(fs.lstat)

const tob64 = (str: string) => Buffer.from(str).toString('base64')
const fromb64 = (str: string) => Buffer.from(str, 'base64').toString()

// export function extractSlugObjectFromArray(arr: { slug: string }[]) {
//   let obj = {}
//   arr.forEach((item) => (obj[item.slug] = item))
//   return obj
// }

/**
 *
 * globals, we may have to make per-invocation in future
 *
 */

let defaultRecognizedExtensions = ['.yml', '.yaml']

// export function loadYaml(ymlpath: string) {
//   const fullData = yaml.safeLoad(fs.readFileSync(path.resolve(ymlpath), 'utf8'))
//   if (Array.isArray(fullData) && fullData.length && fullData[0].title) {
//     // enrich with slug
//     fullData.forEach((col, i) => {
//       col.slug = col.title ? slugify(col.title) : slugify(ymlpath) + i
//     })
//   }
//   return fullData
// }

// export function filterDataArray(fullData: object[], opts: { filterForFields?: string[] }) {
//   let filteredData = fullData
//   if (opts.filterForFields && Array.isArray(opts.filterForFields)) {
//     filteredData = []
//     fullData.forEach((item, i) => {
//       const newItem = {}
//       opts.filterForFields &&
//         opts.filterForFields.forEach((field) => {
//           newItem[field] = item[field]
//         })
//       filteredData.push(newItem)
//     })
//   }
//   return filteredData
// }


type PluginOpts = {
  dirPath: string
  recognizedExtensions?: string[]
  // modifyRemarkConfig?: string
  // // onCreateIndex?: (index: {
  // //     [slug: string]: SSGYamlPluginFile;
  // // }) => Promise<void>
}
type SSGYamlPluginFile = { uid: string; createdAt: Date; modifiedAt: Date; metadata: any }
module.exports = function(opts: PluginOpts) {
  if (typeof opts.dirPath === 'undefined') throw new Error('dirPath not supplied to remark plugin')
  if (!Array.isArray(opts.recognizedExtensions)) throw new Error('opts.recognizedExtensions must be an array of strings')
  let recognizedExtensions = opts.recognizedExtensions || defaultRecognizedExtensions
  // flattens all directories below the dirPath
  // is recursive!
  async function createIndex(recursiveDir: string = opts.dirPath) {
    const files = await readdir(recursiveDir)
    const getStats = async (file: string, _dirPath: string) => {
      const filePath = path.join(_dirPath, file)
      const st = await stat(filePath)
      if (st.isDirectory()) {
        const temp = await createIndex(filePath) // recursion
        return Object.values(temp) // take it back out of an object into an array
      } else {
        if (file === '.DS_Store') return // skip ds store...
        if (!recognizedExtensions.includes(path.extname(file))) return // skip
        return [
          {
            uid: tob64(filePath),
            createdAt: st.birthtime,
            modifiedAt: st.mtime,
          },
        ]
      }
    }
    const arrs: (SSGYamlPluginFile[])[] = await Promise.all(files.map((file: string) => getStats(file, recursiveDir)))
    const strArr = [] as SSGYamlPluginFile[]
    let index = strArr.concat.apply([], arrs) // ghetto flatten
    index = index
      .filter(Boolean)
      .map((file) => {
        // const temp = 
        // const { attributes: metadata } = frontMatter(temp)
        // if (!metadata) return // require metadata
        // if (!metadata.title) return // require title
        // if (metadata.published === false) return // if published is false
        // let pubdate = metadata.date || new Date().toString().slice(4, 15)
        // const date = new Date(`${pubdate} EDT`) // cheeky hack
        // metadata.pubdate = pubdate
        // metadata.date = new Date(pubdate)
        // metadata.dateString = date.toDateString()
        // file.metadata = metadata
        return yaml.safeLoad(fs.readFileSync(fromb64(file.uid), 'utf-8'))
      })
      .filter(notEmpty)
    // // i dont really use this yet
    // if (opts.onCreateIndex) {
    //   await opts.onCreateIndex(index) // optional logging
    // }
    return index
  }

  // https://stackoverflow.com/questions/43118692/typescript-filter-out-nulls-from-an-array
  function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined
  }

  async function getDataSlice(uid: string) {
    const filepath = fromb64(uid)
    const data = yaml.safeLoad(fs.readFileSync(filepath), 'utf-8')
    return data
  }

  return {
    createIndex,
    getDataSlice,
  }
}