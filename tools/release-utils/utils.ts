import { execSync } from 'child_process';

export function exec<T extends boolean = false>(command: string, encode: T): T extends true ? string : Buffer  {
    return execSync(command, { encoding: encode ? 'utf-8' : undefined }) as T extends true ? string : Buffer ;
}

export function getAffectedApps(latestTag: string): string[] {
    const apps = exec(`nx print-affected --select=projects --type=app --base=${latestTag} --head=HEAD`, true).split(',');
    return apps.map((app) => app.trim());
}

export function doesTagExist(version: string): boolean {
    const remoteTags = exec("git ls-remote --tags origin", true).split("\n");
    return remoteTags.some(line => line.endsWith(version));
}