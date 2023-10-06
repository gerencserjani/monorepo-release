import { execSync } from 'child_process';

function execCommand(command: string): string {
    return execSync(command, { encoding: 'utf-8' }).trim();
}

function main() {
    const version = process.argv[2];

    if (!version) {
        console.log('Usage: <script> <new_version>');
        process.exit(1);
    }

    const latestTag = execCommand('git describe --tags --abbrev=0 --match "cms-gateway-v*.*.*"');
    const affected = execCommand(`nx print-affected --select=projects --type=app --base=${latestTag}`).split(',');

    for (const app of affected) {
        execCommand(`npm --prefix ./apps/${app} version ${version}`);
        execCommand(`git commit -am "chore(${app}): Updated ${app} to version ${version}"`);
        execCommand(`git tag "${app}-v${version}"`);
    }

    execCommand(`npm version ${version} --no-git-tag-version`);
    execCommand(`git commit -am "chore(cms-gateway): Updated cms-gateway to version ${version}"`);
    execCommand(`git tag "cms-gateway-v${version}"`);
}

main();
