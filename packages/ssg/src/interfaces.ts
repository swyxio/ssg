import * as child_process from 'child_process';

// copied from sapper source


export class CompileError {
	file: string;
	message: string;
}

export interface CompileResult {
	duration: number;
	errors: CompileError[];
	warnings: CompileError[];
	chunks: Chunk[];
	assets: Record<string, string>;
	css_files: CssFile[];

	to_json: (manifest_data: ManifestData, dirs: Dirs) => BuildInfo
}

export type Chunk = {
	file: string;
	imports: string[];
	modules: string[];
}

export type CssFile = {
	id: string;
	code: string;
};

export type BuildInfo = {
	bundler: string;
	shimport: string;
	assets: Record<string, string>;
	legacy_assets?: Record<string, string>;
	css: {
		main: string | null,
		chunks: Record<string, string[]>
	}
}
export type Route = {
	id: string;
	handlers: {
		type: 'page' | 'route';
		file: string;
	}[];
	pattern: RegExp;
	test: (url: string) => boolean;
	exec: (url: string) => Record<string, string>;
	parts: string[];
	params: string[];
};

export type Template = {
	render: (data: Record<string, string>) => string;
	stream: (req: any, res: any, data: Record<string, string | Promise<string>>) => void;
};

export type WritableStore<T> = {
	set: (value: T) => void;
	update: (fn: (value: T) => T) => void;
	subscribe: (fn: (T: any) => void) => () => void;
};

export type PageComponent = {
	default?: boolean;
	type?: string;
	name: string;
	file: string;
	has_preload: boolean;
};

export type Page = {
	pattern: RegExp;
	parts: Array<{
		component: PageComponent;
		params: string[];
	}>
};

export type ServerRoute = {
	name: string;
	pattern: RegExp;
	file: string;
	params: string[];
};

export type Dirs = {
	dest: string,
	src: string,
	routes: string
};

export type ManifestData = {
	root: PageComponent;
	error: PageComponent;
	components: PageComponent[];
	pages: Page[];
	server_routes: ServerRoute[];
};

export type ReadyEvent = {
	port: number;
	process: child_process.ChildProcess;
};

export type ErrorEvent = {
	type: string;
	error: SapperError;
};

// idk if this exists
export interface SapperError extends Error {
	frame?: string
	loc?: {
		file: string
		line: string
		column: string
	}
} 

export type FatalEvent = {
	message: string;
	log?: string // idk if this exists
};

export type InvalidEvent = {
	changed: string[];
	invalid: {
		client: boolean;
		server: boolean;
		serviceworker: boolean;
	}
};

export type BuildEvent = {
	type: string;
	errors: Array<{ file: string, message: string, duplicate: boolean }>;
	warnings: Array<{ file: string, message: string, duplicate: boolean }>;
	duration: number;
	result: CompileResult;
};

export type FileEvent = {
	file: string;
	size: number;
};

export type FailureEvent = {

};

export type DoneEvent = {};