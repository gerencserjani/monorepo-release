import { execSync } from 'child_process';

function execCommand(command: string): string {
    return execSync(command, { encoding: 'utf-8' }).trim();
}

function main() {
    const newVersion = process.argv[2];

    if (!newVersion) {
        console.log('Usage: <script> <new_version>');
        process.exit(1);
    }

    const latestTag = execCommand('git describe --tags --abbrev=0 --match "cms-gateway-v*.*.*"');
    const affectedAppsOutput = execCommand(`nx print-affected --select=projects --type=app --base=${latestTag}`);
    const affectedApps = affectedAppsOutput.split(',');

    for (const app of affectedApps) {
        const app_name = app.trim();
        // execCommand(`npm --prefix ./apps/${app_name} version ${newVersion}`);
        // execCommand(`git commit -am "chore(${app_name}): Updated ${app_name} to version ${newVersion}"`);
        // execCommand(`git tag "${app_name}-v${newVersion}"`);
    }

    // execCommand(`npm version ${newVersion} --no-git-tag-version`);
    // execCommand(`git commit -am "chore(cms-gateway): Updated cms-gateway to version ${newVersion}"`);
    // execCommand(`git tag "cms-gateway-v${newVersion}"`);
}

main();
