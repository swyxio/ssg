"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chokidar_1 = __importDefault(require("chokidar"));
const execa_1 = __importDefault(require("execa"));
const chalk_1 = __importDefault(require("chalk"));
const tree_kill_1 = __importDefault(require("tree-kill"));
let svelteProcess;
// One-liner for current directory, ignores .dotfiles
const watcher = chokidar_1.default.watch(['ssg.config.js', 'content']);
watcher
    .on('add', watchHandler)
    .on('change', watchHandler)
    .on('error', (error) => console.log(`Watcher error: ${error}`))
    .on('ready', () => console.log('Initial scan complete. Ready for changes'));
function watchHandler(path) {
    return __awaiter(this, void 0, void 0, function* () {
        if (svelteProcess) {
            console.log(`${chalk_1.default.yellow.bold('SSG')}: ${chalk_1.default.blue('ssg.config.js')} changed. Reloading...`);
            tree_kill_1.default(svelteProcess.pid); // need to tree-kill bc child of child
        }
        try {
            svelteProcess = execa_1.default('sapper', ['dev', '--ext', '.svexy .svelte']);
            yield svelteProcess.stdout.pipe(process.stdout);
        }
        catch (err) {
            console.error(err);
        }
    });
}
