import * as fs from 'fs';
import { Logger } from '@nestjs/common';
import { doesTagExist, exec, getAffectedApps } from './tools/release-utils/utils';
import { ChangelogBuilder } from './tools/release-utils/changelog-builder';

function release() {
    const logger = new Logger('Release');
    const changelog = new ChangelogBuilder();
    const { version } = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

    if (!version) {
        logger.error('🔴 Version is not specified in the root package.json.');
        process.exit(1);
    }

    if(doesTagExist(version) === true) {
        logger.error(`🔴 Tag cms-gateway-v${version} already exists!`);
        process.exit(1);
    }

    const latestTag = exec('git describe --tags --abbrev=0 --match "cms-gateway-v*.*.*"', true).trim();
    const affected = getAffectedApps(latestTag);


    if(affected.length === 0 || affected[0] === '') {
        logger.warn('🟠 No apps affected by this release')
        process.exit(1)
    }

    affected.forEach((app) => {
        changelog.build(app, latestTag, version);
        exec(`npm --prefix ./apps/${app} version ${version}`, false);
        logger.log(`📝 Update package.json for ${app}`);
    });

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
