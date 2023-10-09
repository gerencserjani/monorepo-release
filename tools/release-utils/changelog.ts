import { Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from './utils';

interface IGraph {
    projects: string[];
    projectGraph: { dependencies: Record<string,IDependency[]> };
}

interface IDependency {
    source: string;
    target: string;
    type: string;
}

export class Changelog {
    private readonly logger = new Logger(Changelog.name);
    private readonly workspace = JSON.parse(fs.readFileSync('./workspac.json', 'utf8'));
    private readonly libsCommits: Map<string, string[]>;
    private readonly graph: IGraph;

    constructor(private readonly latestTag: string) {
        this.graph = this.getGraph();
        this.libsCommits = this.getLibsCommits();
    }

    build(app: string, version: string) {
        const appPath = this.getPath(app);
        const commits = this.collectCommits(app, appPath);

        this.updateChangelog(appPath, commits, version);
        exec(`git add ${appPath}`, false);

        this.logger.log(`📜 Update changelog for ${app}`);
    }

    private updateChangelog(appPath: string, commits: string[], tag: string) {
        const changelogPath = path.join(appPath, 'CHANGELOG.md');
        let content = '';

        if (fs.existsSync(changelogPath)) {
            content = fs.readFileSync(changelogPath, { encoding: 'utf-8' });
        }

        const categorizedCommits: { [key: string]: string[] } = {};

        for (const commit of commits) {
            const match = commit.match(/^([a-zA-Z]+)(\(.*\))?: (.*)$/);
            if (match) {
                const type = match[1];
                if (!categorizedCommits[type]) {
                    categorizedCommits[type] = [];
                }
                categorizedCommits[type].push(commit);
            }
        }

        let newEntry = `## ${tag}\n\n`;

        const types = ['feat', 'fix', 'chore', 'refactor', 'perf', 'test'];

        const capitalizeFirstLetter = (string: string) => string.charAt(0).toUpperCase() + string.slice(1);

        for (const type of types) {
            if (categorizedCommits[type]) {
                newEntry += `### ${capitalizeFirstLetter(type)}\n\n`;
                newEntry += categorizedCommits[type].map(commit => `- ${commit}`).join('\n') + "\n\n";
            }
        }

        content = newEntry + content;
        fs.writeFileSync(changelogPath, content, { encoding: 'utf-8' });
    }

    private collectCommits(app: string, appPath: string): string[] {
        const result: string[] = [...this.getCommits(appPath)]
        const dependencies = this.getDependencies(app);

        for(const dependency of dependencies) {
            const commits: string[] = this.libsCommits.get(dependency) || [];
            result.push(...commits);
        }
        return result;
    }

    private getDependencies(app: string): string[] {
        const dependencies: IDependency[] = this.graph.projectGraph.dependencies[app];
        return dependencies.map((d) => d.target).filter((d) => this.graph.projects.includes(d));
    }

    private getGraph(): IGraph {
        return JSON.parse(exec(`nx print-affected --base=${this.latestTag} --head=HEAD`, true));
    }

    private getPath(projectName: string): string {
        //TODO: use when migrating to nx 16
        // return JSON.parse(exec(`nx show project ${projectName}`, true)).root;
        return this.workspace.projects[projectName];
    }

    private getCommits(path: string): string[] {
        const commits = exec(`git log ${this.latestTag}..HEAD --pretty=format:'%s' -- ${path}`, true);
        return commits.split("\n").map((c) => c.trim());
    }

    private getAffectedLibs(): string[] {
        const libs = exec(`nx print-affected --select=projects --type=lib --base=${this.latestTag} --head=HEAD`, true);
        return libs.split(',').map((l) => l.trim());
    }

    private getLibsCommits(): Map<string, string[]> {
        const libsCommits = new Map<string, string[]>();
        const libs = this.getAffectedLibs();
        libs.forEach((lib) => {
            const path = this.getPath(lib);
            const commits = this.getCommits(path);
            libsCommits.set(lib, commits);
        });
        return libsCommits;
    }
}
