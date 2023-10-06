import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '@nestjs/common';

interface IGraph {
 projects: string[];
 projectGraph: { dependencies: Record<string,IGraphDependency[]> };
}

interface IGraphDependency {
    source: string;
    target: string;
    type: string;
}

class ChangelogBuilder {
    static build(project: string, graph: IGraph, latestTag: string, version: string) {
        //TODO ADD WORKSPACE JSON
        const workspace: { projects: Record<string, string> } = {
            projects: {
                'app1': 'apps/app1',
                'app2': 'apps/app2',
            }
        }
        const path = workspace.projects[project]
        const commits = this.getCommits(project, graph, latestTag);
        this.updateChangelog(path, commits.join('\n'), version);
        exec(`git add ${path}`, false);
    }

    private static updateChangelog(projectPath: string, commits: string, tag: string) {
        const changelogPath = path.join(projectPath, 'CHANGELOG.md');
        let changelogContent = '';

        if (fs.existsSync(changelogPath)) {
            changelogContent = fs.readFileSync(changelogPath, { encoding: 'utf-8' });
        }

        const newEntry = `## ${tag}\n\n${commits}\n\n`;
        changelogContent = newEntry + changelogContent;

        fs.writeFileSync(changelogPath, changelogContent, { encoding: 'utf-8' });
    }

    private static getCommits(project: string, graph: IGraph, latestTag: string): string[] {
        console.log(getNxProjectPaths())
        const result: string[] = [];
        const dependencies = this.getDependencies(project, graph);
        const paths = dependencies.map((d) => this.getPath(d));

        paths.push(this.getPath(project));

        for(const path of paths) {
            const commits = exec(`git log ${latestTag}..HEAD --pretty=format:'%s' -- ${path}`, true).trim();
            result.push(commits);
        }
        return result;
    }

    private static getPath(project: string): string {
        const parts = project.split('-');
        const category = parts[0] === 'app' ? 'apps' : 'libs';
        const folders = parts.slice(1).join('/');
        return `${category}/${folders}`;
    }

    private static getDependencies(project: string, graph: IGraph): string[] {
        const dependencies: IGraphDependency[] = graph.projectGraph.dependencies[project];
        return dependencies.map((d) => d.target).filter((d) => graph.projects.includes(d));
    }
}

function getNxProjectPaths(): Record<string, string> {
    const nodes = exec('nx print-affected --select=projectGraph.nodes --base=master', true);
    const paths: Record<string, string> = {};

    for (const [name, data] of Object.entries(JSON.parse(nodes)) as any) {
        paths[name] = data.root;
    }

    return paths;
}

function exec<T extends boolean = false>(command: string, encode: T): T extends true ? string : Buffer  {
    return execSync(command, { encoding: encode ? 'utf-8' : undefined }) as T extends true ? string : Buffer ;
}

function getAffectedApps(latestTag: string): string[] {
    const apps = exec(`nx print-affected --select=projects --type=app --base=${latestTag}`, true).split(',');
    return apps.map((app) => app.trim());
}

function doesTagExist(version: string): boolean {
    const remoteTags = exec("git ls-remote --tags origin", true).split("\n");
    return remoteTags.some(line => line.endsWith(version));
}

function release() {
    const logger = new Logger('Release');
    const version = process.argv[2];

    if (!version) {
        console.log('Usage: <script> <new_version>');
        process.exit(1);
    }

    if(doesTagExist(version) === true) {
        logger.error(`🟠 Tag cms-gateway-v${version} already exists!`);
        process.exit(1);
    }

    const latestTag = exec('git describe --tags --abbrev=0 --match "cms-gateway-v*.*.*"', true).trim();
    const affected = getAffectedApps(latestTag);
    const graph = JSON.parse(exec(`nx print-affected --base=${latestTag}`, true));

    if(affected.length === 0 || affected[0] === '') {
        process.exit(1)
    }

    affected.forEach((app) => {
        ChangelogBuilder.build(app, graph, latestTag, version);
        logger.log(`📜 Update changelog for ${app}`);
        exec(`npm --prefix ./apps/${app} version ${version}`, false);
        logger.log(`📝 Update package.json for ${app}`);
    });

    exec(`npm version ${version} --no-git-tag-version`, false);
    logger.log(`📝 Update package.json for cms-gateway`);
    exec(`git commit -am "release(cms-gateway): Updated cms-gateway to version ${version}"`, false);
    logger.log(`📦 Commit cms-gateway changes`);

    affected.forEach((app) => {
        exec(`git tag "${app}-v${version}"`, false)
        logger.log(`🔖 Tag ${app}`);
    });

    exec(`git tag "cms-gateway-v${version}"`, false);
    logger.log(`🔖 Tag cms-gateway`);
}

release();
