import { execSync } from 'child_process';
import type { ExecutorContext, ProjectGraphDependency } from '@nx/devkit';

export class ProjectUtil {
    // static async getDependencyRoots(project: string): Promise<any> {
    //     const dependencies = await this.getDependencies(project);
    //     return dependencies.map((name) => ({
    //         name,
    //         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    //         path: context.projectsConfigurations!.projects[name].root,
    //     }));
    // }

    static async getDependencies(project: string): Promise<string[]> {
        const {createProjectGraphAsync} = await import('@nx/devkit');
        const dependencyGraph =
            typeof createProjectGraphAsync === 'function'
                ? await createProjectGraphAsync()
                :
                (
                    (await import('@nx/workspace/src/core/project-graph')) as any
                ).createProjectGraph();
        return this.getProjectsFromDependencies(dependencyGraph.dependencies[project]);
    }

    private static getProjectsFromDependencies(dependencies: ProjectGraphDependency[]): string[] {
        return dependencies?.filter((d) => !d.target.startsWith('npm:')).map((d) => d.target);
    }
}

async function main() {
    const version = process.argv[2];

    if (!version) {
        console.log('Usage: <script> <new_version>');
        process.exit(1);
    }

    const latestTag = execSync('git describe --tags --abbrev=0 --match "cms-gateway-v*.*.*"', {encoding: 'utf-8'});
    const affected = execSync(`nx print-affected --select=projects --type=app --base=${latestTag}`, {encoding: 'utf-8'}).split(',');

    for (const app of affected) {
        const app_name = app.trim();
        console.log(await ProjectUtil.getDependencies(app_name));
        // execSync(`npm --prefix ./apps/${app_name} version ${version}`);
        // execSync(`git commit -am "chore(${app_name}): Updated ${app_name} to version ${version}"`);
        // execSync(`git tag "${app_name}-v${version}"`);
    }

    // execSync(`npm version ${version} --no-git-tag-version`);
    // execSync(`git commit -am "chore(cms-gateway): Updated cms-gateway to version ${version}"`);
    // execSync(`git tag "cms-gateway-v${version}"`);
}

main();
