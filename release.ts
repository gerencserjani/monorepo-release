import { execSync } from 'child_process';

function main() {
    const version = process.argv[2];

    if (!version) {
        console.log('Usage: <script> <new_version>');
        process.exit(1);
    }

    const latestTag = execSync('git describe --tags --abbrev=0 --match "cms-gateway-v*.*.*"', { encoding: 'utf-8' });
    const affected = execSync(`nx print-affected --select=projects --type=app --base=${latestTag}`, { encoding: 'utf-8' }).split(',');

    for (const app of affected) {
        const app_name = app.trim();
        execSync(`npm --prefix ./apps/${app_name} version ${version}`);
        execSync(`git commit -am "chore(${app_name}): Updated ${app_name} to version ${version}"`);
        execSync(`git tag "${app_name}-v${version}"`);
    }

    execSync(`npm version ${version} --no-git-tag-version`);
    execSync(`git commit -am "chore(cms-gateway): Updated cms-gateway to version ${version}"`);
    execSync(`git tag "cms-gateway-v${version}"`);
}

main();
