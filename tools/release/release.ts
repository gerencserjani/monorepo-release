import * as fs from 'fs';
import { exec } from './utils';
import { Changelog } from './changelog';


function getAffectedApps(latestTag: string): string[] {
    const apps = exec(`nx print-affected --select=projects --type=app --base=${latestTag} --head=HEAD`, true);
    return apps.split(',').map((a) => a.trim());
}

function getLatestTag(): string {
    const tag = exec('git describe --tags --abbrev=0 --match "cms-gateway-v*.*.*"', true);
    return tag.trim();
}

function doesTagExist(version: string): boolean {
    const tags = exec("git ls-remote --tags origin", true);
    return tags.split("\n").some((t) => t.endsWith(version));
}

function release() {
    const { version } = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

    if (!version) {
        console.error('🔴 Version is not specified in the root package.json.');
        process.exit(1);
    }

    if(doesTagExist(version) === true) {
        console.error(`🔴 Tag cms-gateway-v${version} already exists!`);
        process.exit(1);
    }

    const latestTag = getLatestTag();
    const apps = getAffectedApps(latestTag);


    if(apps.length === 0 || apps[0] === '') {
        console.warn('🟠 No apps affected by this release')
        process.exit(1)
    }

    const changelog = new Changelog(latestTag);

    apps.forEach((app) => {
        changelog.build(app, version);
        exec(`npm --prefix ./apps/${app} version ${version}`, false);
        console.log(`📝 Update package.json for ${app}`);
    });

    exec(`git commit -am "release(cms-gateway): Updated cms-gateway to version ${version}"`, false);
    console.log(`📦 Commit cms-gateway changes`);

    apps.forEach((app) => {
        exec(`git tag "${app}-v${version}"`, false)
        console.log(`🔖 Tag ${app}`);
    });

    exec(`git tag "cms-gateway-v${version}"`, false);
    console.log(`🔖 Tag cms-gateway`);
}

release();
