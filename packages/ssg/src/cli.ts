// mostly copied from sapper source
import * as fs from 'fs'
import * as path from 'path'
import sade from 'sade'
import colors from 'kleur'
import { elapsed, repeat, left_pad, format_milliseconds } from './utils'
import { InvalidEvent, ErrorEvent, FatalEvent, BuildEvent, ReadyEvent } from './interfaces'
//@ts-ignore
import { MultiSelect } from 'enquirer'

type TODO_ANY = any

const prog = sade('ssg').version(0.01)

if (process.argv[2] === 'start') {
  // remove this in a future version
  console.error(colors.bold().red(`'sapper start' has been removed`))
  console.error(`Use 'node [build_dir]' instead`)
  process.exit(1)
}

const start = Date.now()


prog
  .command('eject')
  .describe('Copy out fallback files')
  .action(
    // async (opts: {}) => {
    async () => {
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
          { name: 'error.svelte', value: 'src/routes/_error.svelte', hint: `(unused) error.svelte` },
          { name: 'layout.svelte', value: 'src/routes/_layout.svelte', hint: `(unused) layout.svelte` },
        ],
        result(names: any) {
          return this.map(names); // so we can actually get at the value
        }
      });
      // prompt.run().then(console.log)
      const { eject } = await import('./eject')
      const selectedFiles: Record<string, string> = await prompt.run()
      const entries = Object.entries(selectedFiles)
      if (entries.length < 1) {
        console.warn('no files selected')
      }
      for (let arr of entries) {
        await eject(arr)
      }
    })

prog
  .command('dev')
  .describe('Start a development server')
  .option('-p, --port', 'Specify a port')
  .option('-o, --open', 'Open a browser window')
  .option('--dev-port', 'Specify a port for development server')
  .option('--hot', 'Use hot module replacement (requires webpack)', true)
  .option('--live', 'Reload on changes if not using --hot', true)
  .option('--bundler', 'Specify a bundler (rollup or webpack)')
  .option('--cwd', 'Current working directory', '.')
  .option('--src', 'Source directory', 'src')
  .option('--routes', 'Routes directory', 'src/routes')
  .option('--static', 'Static files directory', 'static')
  .option('--output', 'Sapper intermediate file output directory', 'node_modules/@sapper')
  .option('--build-dir', 'Development build directory', '__sapper__/dev')
  .option('--ext', 'Custom Route Extension', '.svelte .svexy .html')
  .option('--ssgConfig', 'SSG config file', 'ssg.config.js')
  .action(
    async (opts: {
      port: number
      open: boolean
      'dev-port': number
      live: boolean
      hot: boolean
      bundler?: 'rollup' | 'webpack'
      cwd: string
      src: string
      routes: string
      static: string
      output: string
      'build-dir': string
      ext: string
      ssgConfig: string
    }) => {
      // @ts-ignore
      const { dev } = await import('@ssgjs/sapper/api')
      try {
        const watcher = dev({
          cwd: opts.cwd,
          src: opts.src,
          routes: opts.routes,
          static: opts.static,
          output: opts.output,
          dest: opts['build-dir'],
          port: opts.port,
          'dev-port': opts['dev-port'],
          live: opts.live,
          hot: opts.hot,
          bundler: opts.bundler,
          ext: opts.ext,
        })

        let first = true

        /**
         *
         * SSG SECTION
         *
         * verify ssg config exists
         *
         */
        const { getSSGDataOnce, watchSSGFiles, readSSGConfig } = await import('./cli-ssg')
        let ssgConfigPath = opts.ssgConfig || 'ssg.config.js'
        // warning: opts.ssgConfig doesnt work for the readConfig seciton yet
        // TODO!
        const ssgConfig = readSSGConfig(ssgConfigPath)
        if (ssgConfig) {
          // actually do stuff with it
          await getSSGDataOnce(ssgConfig, path.resolve(opts['build-dir'], '../'))
          watchSSGFiles(watcher, ssgConfig)
        }
        /**
         *
         * END SSG SECTION
         *
         *
         */

        watcher.on('stdout', (data: TODO_ANY) => {
          process.stdout.write(data)
        })

        watcher.on('stderr', (data: TODO_ANY) => {
          process.stderr.write(data)
        })

        watcher.on('ready', async (event: ReadyEvent) => {
          if (first) {
            console.log(colors.bold().cyan(`> Listening on http://localhost:${event.port}`))
            if (opts.open) {
              const { exec } = await import('child_process')
              exec(`open http://localhost:${event.port}`)
            }
            first = false
          }
        })

        watcher.on('invalid', (event: InvalidEvent) => {
          event.changed = event.changed.filter(Boolean)
          if (event.changed.length < 1) {
            // console.log('SSGDEBUG invalidevent', event)
            return
          }
          const changed = event.changed.map((filename: string) => path.relative(process.cwd(), filename)).join(', ')
          console.log(`\n${colors.bold().cyan(changed)} changed. rebuilding...`)
        })

        watcher.on('error', (event: ErrorEvent) => {
          const { type, error } = event

          console.log(colors.bold().red(`✗ ${type}`))

          if (error.loc && error.loc.file) {
            console.log(
              colors.bold(`${path.relative(process.cwd(), error.loc.file)} (${error.loc.line}:${error.loc.column})`),
            )
          }

          console.log(colors.red(event.error.message))
          if (error.frame) console.log(error.frame)
        })

        watcher.on('fatal', (event: FatalEvent) => {
          console.log(colors.bold().red(`> ${event.message}`))
          if (event.log) console.log(event.log)
        })

        watcher.on('build', (event: BuildEvent) => {
          if (event.errors.length) {
            console.log(colors.bold().red(`✗ ${event.type}`))

            event.errors
              .filter((e: TODO_ANY) => !e.duplicate)
              .forEach((error: TODO_ANY) => {
                if (error.file) console.log(colors.bold(error.file))
                console.log(error.message)
              })

            const hidden = event.errors.filter((e: TODO_ANY) => e.duplicate).length
            if (hidden > 0) {
              console.log(`${hidden} duplicate ${hidden === 1 ? 'error' : 'errors'} hidden\n`)
            }
          } else if (event.warnings.length) {
            console.log(colors.bold().yellow(`• ${event.type}`))

            event.warnings
              .filter((e) => !e.duplicate)
              .forEach((warning: TODO_ANY) => {
                if (warning.file) console.log(colors.bold(warning.file))
                console.log(warning.message)
              })

            const hidden = event.warnings.filter((e: TODO_ANY) => e.duplicate).length
            if (hidden > 0) {
              console.log(`${hidden} duplicate ${hidden === 1 ? 'warning' : 'warnings'} hidden\n`)
            }
          } else {
            console.log(
              `${colors.bold().green(`✔ ${event.type}`)} ${colors.gray(`(${format_milliseconds(event.duration)})`)}`,
            )
          }
        })
      } catch (err) {
        console.log(colors.bold().red(`> ${err.message}`))
        console.log(colors.gray(err.stack))
        process.exit(1)
      }
    },
  )

prog
  .command('build [dest]')
  .describe('Create a production-ready version of your app')
  .option('-p, --port', 'Default of process.env.PORT', '3000')
  .option('--bundler', 'Specify a bundler (rollup or webpack, blank for auto)')
  .option('--legacy', 'Create separate legacy build')
  .option('--cwd', 'Current working directory', '.')
  .option('--src', 'Source directory', 'src')
  .option('--routes', 'Routes directory', 'src/routes')
  .option('--output', 'Sapper intermediate file output directory', 'node_modules/@sapper')
  .option('--ext', 'Custom page route extensions (space separated)', '.svelte .svexy .html')
  .example(`build custom-dir -p 4567`)
  .action(
    async (
      dest: string = '__sapper__/build',
      opts: {
        port: string
        legacy: boolean
        bundler?: 'rollup' | 'webpack'
        cwd: string
        src: string
        routes: string
        output: string
        ext: string
      },
    ) => {
      console.log(`> Building...`)

      try {
        await _build(opts.bundler, opts.legacy, opts.cwd, opts.src, opts.routes, opts.output, dest, opts.ext)

        const launcher = path.resolve(dest, 'index.js')

        fs.writeFileSync(
          launcher,
          `
				// generated by sapper build at ${new Date().toISOString()}
				process.env.NODE_ENV = process.env.NODE_ENV || 'production';
				process.env.PORT = process.env.PORT || ${opts.port || 3000};

				console.log('Starting server on port ' + process.env.PORT);
				require('./server/server.js');
			`
            .replace(/^\t+/gm, '')
            .trim(),
        )

        console.error(`\n> Finished in ${elapsed(start)}. Type ${colors.bold().cyan(`node ${dest}`)} to run the app.`)
      } catch (err) {
        console.log(`${colors.bold().red(`> ${err.message}`)}`)
        console.log(colors.gray(err.stack))
        process.exit(1)
      }
    },
  )

prog
  .command('export [dest]')
  .describe('Export your app as static files (if possible)')
  .option('--build', '(Re)build app before exporting', true)
  .option('--basepath', 'Specify a base path')
  .option('--host', 'Host header to use when crawling site')
  .option('--concurrent', 'Concurrent requests', 8)
  .option('--timeout', 'Milliseconds to wait for a page (--no-timeout to disable)', 5000)
  .option('--legacy', 'Create separate legacy build')
  .option('--bundler', 'Specify a bundler (rollup or webpack, blank for auto)')
  .option('--cwd', 'Current working directory', '.')
  .option('--src', 'Source directory', 'src')
  .option('--routes', 'Routes directory', 'src/routes')
  .option('--static', 'Static files directory', 'static')
  .option('--output', 'Sapper intermediate file output directory', 'node_modules/@sapper')
  .option('--build-dir', 'Intermediate build directory', '__sapper__/build')
  .option('--ext', 'Custom page route extensions (space separated)', '.svelte .svexy .html')
  .option('--entry', 'Custom entry points (space separated)', '/')
  .action(
    async (
      dest: string = '__sapper__/export',
      opts: {
        build: boolean
        legacy: boolean
        bundler?: 'rollup' | 'webpack'
        basepath?: string
        host?: string
        concurrent: number
        timeout: number | false
        cwd: string
        src: string
        routes: string
        static: string
        output: string
        'build-dir': string
        ext: string
        entry: string
        ssgConfig: string // swyx
      },
    ) => {
      try {
        if (opts.build) {
          console.log(`> Building...`)
          await _build(
            opts.bundler,
            opts.legacy,
            opts.cwd,
            opts.src,
            opts.routes,
            opts.output,
            opts['build-dir'],
            opts.ext,
          )
          console.error(`\n> Built in ${elapsed(start)}`)
        }

        // @ts-ignore
        const { export: _export } = await import('@ssgjs/sapper/api')
        const { default: pb } = await import('pretty-bytes')

        /**
         *
         * SSG SECTION
         *
         * verify ssg config exists
         *
         */
        const { getSSGDataOnce, readSSGConfig } = await import('./cli-ssg')
        let ssgConfigPath = opts.ssgConfig || 'ssg.config.js'
        // warning: opts.ssgConfig doesnt work for the readConfig seciton yet
        // TODO!
        const ssgConfig = readSSGConfig(ssgConfigPath)
        let mainIndex
        if (ssgConfig) {
          // actually do stuff with it
          mainIndex = await getSSGDataOnce(ssgConfig, path.resolve(opts['build-dir'], '../'))
        }

        /**
         *
         * END SSG SECTION
         *
         *
         */

        await _export({
          cwd: opts.cwd,
          static: opts.static,
          build_dir: opts['build-dir'],
          export_dir: dest,
          basepath: opts.basepath,
          host_header: opts.host,
          timeout: opts.timeout,
          concurrent: opts.concurrent,
          entry: opts.entry,

          oninfo: (event: TODO_ANY) => {
            console.log(colors.bold().cyan(`> ${event.message}`))
          },

          onfile: (event: TODO_ANY) => {
            const size_color =
              event.size > 150000 ? colors.bold().red : event.size > 50000 ? colors.bold().yellow : colors.bold().gray
            const size_label = size_color(left_pad(pb(event.size), 10))

            const file_label =
              event.status === 200
                ? event.file
                : colors.bold()[event.status >= 400 ? 'red' : 'yellow'](`(${event.status}) ${event.file}`)

            console.log(`${size_label}   ${file_label}`)
          },
        })

        /**
         *
         * SSG SECTION
         *
         * verify ssg config exists
         *
         */
        if (ssgConfig && ssgConfig.postExport && mainIndex) {
          await ssgConfig.postExport(mainIndex)
        }
        /**
         *
         * END SSG SECTION
         *
         *
         */
        console.error(
          `\n> Finished in ${elapsed(start)}. Type ${colors.bold().cyan(`npx serve ${dest}`)} to run the app.`,
        )
      } catch (err) {
        console.error(colors.bold().red(`> ${err.message}`))
        process.exit(1)
      }
    },
  )

prog.parse(process.argv, { unknown: (arg: string) => `Unknown option: ${arg}` })

async function _build(
  bundler: 'rollup' | 'webpack' | undefined,
  legacy: boolean,
  cwd: string,
  src: string,
  routes: string,
  output: string,
  dest: string,
  ext: string,
) {
  // @ts-ignore
  const { build } = await import('@ssgjs/sapper/api')

  await build({
    bundler,
    legacy,
    cwd,
    src,
    routes,
    dest,
    ext,
    output,
    oncompile: (event: TODO_ANY) => {
      let banner = `built ${event.type}`
      let c = (txt: string) => colors.cyan(txt)

      const { warnings } = event.result
      if (warnings.length > 0) {
        banner += ` with ${warnings.length} ${warnings.length === 1 ? 'warning' : 'warnings'}`
        c = (txt: string) => colors.cyan(txt)
      }

      console.log()
      console.log(c(`┌─${repeat('─', banner.length)}─┐`))
      console.log(c(`│ ${colors.bold(banner)} │`))
      console.log(c(`└─${repeat('─', banner.length)}─┘`))

      console.log(event.result.print())
    },
  })
}
