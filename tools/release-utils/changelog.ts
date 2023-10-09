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

interface ICommit {
    hash: string;
    message: string;
    issue?: string | null;
}

const COMMIT_TYPES = ['feat', 'fix', 'chore', 'refactor', 'perf', 'test'];
const REPO_URL = "https://github.com/gerencserjani/monorepo-release";

export class Changelog {
    private readonly logger = new Logger(Changelog.name);
    private readonly workspace = JSON.parse(fs.readFileSync('./workspac.json', 'utf8'));
    private readonly affectedLibsCommits: Map<string, ICommit[]>;
    private readonly graph: IGraph;

    constructor(private readonly latestTag: string) {
        this.graph = this.getGraph();
        this.affectedLibsCommits = this.getAffectedLibsCommits();
    }

    build(app: string, version: string) {
        const path = this.getPath(app);
        const commits = this.collectCommits(app, path);

        this.updateChangelog(path, commits, version);
        exec(`git add ${path}`, false);

        this.logger.log(`📜 Update changelog for ${app}`);
    }

    private updateChangelog(appPath: string, commits: ICommit[], version: string) {
        const changelogPath = path.join(appPath, 'CHANGELOG.md');
        let content = '';

        if (fs.existsSync(changelogPath)) {
            content = fs.readFileSync(changelogPath, { encoding: 'utf-8' });
        }

        const categorizedCommits = this.categorizeCommits(commits);
        const newContent = this.generateNewContent(categorizedCommits, version);

        content = newContent + content;
        fs.writeFileSync(changelogPath, content, { encoding: 'utf-8' });
    }

    private categorizeCommits(commits: ICommit[]): Record<string, ICommit[]> {
        return commits.reduce<Record<string, ICommit[]>>((acc, commit) => {
            const match = commit.message.match(/^([a-zA-Z]+)(\(.*\))?: (.*)$/);
            if (match) {
                const type = match[1];
                acc[type] = acc[type] || [];
                acc[type].push(commit);
            }
            return acc;
        }, {});
    }

    private generateNewContent(categorizedCommits: Record<string, ICommit[]>, version: string): string {
        let content = `## ${version}`;

        for (const type of COMMIT_TYPES) {
            if (categorizedCommits[type]) {
                content += `### ${type}`;
                content += categorizedCommits[type].map(commit => {
                    const strippedMessage = commit.message.replace(/^([a-zA-Z]+)\((.*)\):\s*/, '$2: ');
                    let commitLine = `- ${strippedMessage} ([${commit.hash}](${REPO_URL}/commit/${commit.hash}))`;

                    if (commit.issue) {
                        commitLine += ` ([#${commit.issue}](${REPO_URL}/issues/${commit.issue}))`;
                    }

                    return commitLine;
                }).join('\n') + "\n\n";
            }
        }

        return content;
    }

    private collectCommits(app: string, appPath: string): ICommit[] {
        const result: ICommit[] = this.getCommits(appPath);
        const dependencies = this.getDependencies(app);

        for(const dependency of dependencies) {
            const commits: ICommit[] = this.affectedLibsCommits.get(dependency) || [];
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

    private getCommits(path: string): ICommit[] {
        const rawCommits = exec(`git log ${this.latestTag}..HEAD --pretty=format:'%h|%s|%b' -- ${path}`, true);
        const commitLines = rawCommits.split("\n").map(line => line.trim());

        return commitLines.map(line => {
            const [hash, message, body] = line.split("|");

            let issue = null;
            const issueMatch = body?.match(/#(\d+)/);
            if (issueMatch) {
                issue = issueMatch[1];
            }

            return { hash, message, issue };
        });
    }

    private getAffectedLibs(): string[] {
        const libs = exec(`nx print-affected --select=projects --type=lib --base=${this.latestTag} --head=HEAD`, true);
        return libs.split(',').map((l) => l.trim());
    }

    private getAffectedLibsCommits(): Map<string, ICommit[]> {
        const libsCommits = new Map<string, ICommit[]>();
        const libs = this.getAffectedLibs();
        libs.forEach((lib) => {
            const path = this.getPath(lib);
            const commits = this.getCommits(path);
            libsCommits.set(lib, commits);
        });
        return libsCommits;
    }
}
