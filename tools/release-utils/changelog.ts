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
    private readonly workspace = JSON.parse(fs.readFileSync('./workspace.json', 'utf8'));
    private readonly libsCommits = new Map<string, string>();
    private readonly graph = this.getGraph();

    constructor(private readonly latestTag: string) {
        this.setLibsCommits();
    }

    build(app: string, version: string) {
        const appPath = this.getPath(app);
        const commits = this.collectCommits(app, appPath);

        this.updateChangelog(appPath, commits.join('\n'), version);
        exec(`git add ${appPath}`, false);

        this.logger.log(`📜 Update changelog for ${appPath}`);
    }

    private updateChangelog(appPath: string, commits: string, tag: string) {
        const changelogPath = path.join(appPath, 'CHANGELOG.md');
        let changelogContent = '';

        if (fs.existsSync(changelogPath)) {
            changelogContent = fs.readFileSync(changelogPath, { encoding: 'utf-8' });
        }

        const newEntry = `## ${tag}\n\n${commits}\n\n`;
        changelogContent = newEntry + changelogContent;

        fs.writeFileSync(changelogPath, changelogContent, { encoding: 'utf-8' });
    }

    private collectCommits(app: string, appPath: string): string[] {
        const result: string[] = [this.getCommits(appPath)]
        const dependencies = this.getDependencies(app);

        for(const dependency of dependencies) {
            const commits = this.libsCommits.get(dependency);
            result.push(commits);
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

    private getCommits(path: string): string {
        return exec(`git log ${this.latestTag}..HEAD --pretty=format:'%s' -- ${path}`, true).trim();
    }

    private getAffectedLibs(): string[] {
        const libs = exec(`nx print-affected --select=projects --type=lib --base=${this.latestTag} --head=HEAD`, true).split(',');
        return libs.map((lib) => lib.trim());
    }

    private setLibsCommits(): void {
        const libs = this.getAffectedLibs();
        libs.forEach((lib) => {
            const path = this.getPath(lib);
            const commits = this.getCommits(path);
            this.libsCommits.set(lib, commits);
        });
    }
}
