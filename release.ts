import { execSync } from 'child_process';

function exec<T extends boolean = false>(command: string, encode: T): T extends true ? string : Buffer  {
    return execSync(command, { encoding: encode ? 'utf-8' : undefined }) as T extends true ? string : Buffer ;
}

interface IGraph {
 projects: string[];
 projectGraph: { dependencies: Record<string,unknown[]> };
}

export class ChangelogBuilder {
    static build() {}

    static getCommitsOfDependencies(project: string, graph: IGraph, latestTag: string) {
        const paths = this.dependenciesToPath(project, graph);
        for(const path of paths) {
            const commits = exec(`git log ${latestTag}..HEAD --pretty=format:'%s' -- ${path}`, true).trim();
            console.log(commits)
        }
    }

    static dependenciesToPath(project: string, graph: IGraph): string[] {
        //TODO ADD WORKSPACE JSON
        const workspace: { projects: Record<string, string> } = {
            projects: {
                'app1': 'apps/app1',
                'app2': 'apps/app2',
                'util-string': 'libs/util/string',
            }
        }
        const dependencies = this.filterDependencies(project, graph);
        const paths = dependencies.map((d) => workspace.projects[d]);
        paths.push(workspace.projects[project]);
        return paths;
    }

    static filterDependencies(project: string, graph: IGraph): string[] {
        const { projects, projectGraph } = graph;
        const dependencies = this.getAllDependenciesOfProject(projectGraph.dependencies[project]);
        return dependencies.filter((d) => projects.includes(d));
    }

    private static getAllDependenciesOfProject(dependencies: any[]): string[] {
        return dependencies?.filter((d) => !d.target.startsWith('npm:')).map((d) => d.target);
    }
}

function main() {
    const version = process.argv[2];

    if (!version) {
        console.log('Usage: <script> <new_version>');
        process.exit(1);
    }

    const latestTag = exec('git describe --tags --abbrev=0 --match "cms-gateway-v*.*.*"', true).trim();
    const affected = exec(`nx print-affected --select=projects --type=app --base=${latestTag}`, true).split(',');
    const graph = JSON.parse(exec(`nx print-affected --base=${latestTag}`, true));

    for (const app of affected) {
        const app_name = app.trim();
        ChangelogBuilder.getCommitsOfDependencies(app_name, graph, latestTag);
        // exec(`npm --prefix ./apps/${app_name} version ${version}`, false);
        // exec(`git commit -am "chore(${app_name}): Updated ${app_name} to version ${version}"`, false);
        // exec(`git tag "${app_name}-v${version}"`, false);
    }

    // exec(`npm version ${version} --no-git-tag-version`, false);
    // exec(`git commit -am "chore(cms-gateway): Updated cms-gateway to version ${version}"`, false);
    // exec(`git tag "cms-gateway-v${version}"`, false);
}

main();
