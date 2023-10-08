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

export class ChangelogBuilder {
    private readonly logger = new Logger(ChangelogBuilder.name);
    build(projectName: string, latestTag: string, version: string) {
        const graph = this.getGraph(latestTag);
        const projectPath = this.getPath(projectName);
        const commits = this.getCommits(projectName, projectPath, graph, latestTag);

        this.updateChangelog(projectPath, commits.join('\n'), version);
        exec(`git add ${projectPath}`, false);

        this.logger.log(`📜 Update changelog for ${projectName}`);
    }

    private updateChangelog(projectPath: string, commits: string, tag: string) {
        const changelogPath = path.join(projectPath, 'CHANGELOG.md');
        let changelogContent = '';

        if (fs.existsSync(changelogPath)) {
            changelogContent = fs.readFileSync(changelogPath, { encoding: 'utf-8' });
        }

        const newEntry = `## ${tag}\n\n${commits}\n\n`;
        changelogContent = newEntry + changelogContent;

        fs.writeFileSync(changelogPath, changelogContent, { encoding: 'utf-8' });
    }

    private getCommits(projectName: string, projectPath: string, graph: IGraph, latestTag: string): string[] {
        const result: string[] = [];
        const dependencies = this.getDependencies(projectName, graph);
        const paths = dependencies.map((d) => this.getPath(d));

        paths.push(projectPath);

        for(const path of paths) {
            const commits = exec(`git log ${latestTag}..HEAD --pretty=format:'%s' -- ${path}`, true).trim();
            result.push(commits);
        }
        return result;
    }

    private getGraph(latestTag: string): IGraph {
        return JSON.parse(exec(`nx print-affected --base=${latestTag} --head=HEAD`, true));
    }

    private getPath(projectName: string): string {
        return JSON.parse(exec(`nx show project ${projectName}`, true)).root;
    }

    private getDependencies(projectName: string, graph: IGraph): string[] {
        const dependencies: IDependency[] = graph.projectGraph.dependencies[projectName];
        return dependencies.map((d) => d.target).filter((d) => graph.projects.includes(d));
    }
}
