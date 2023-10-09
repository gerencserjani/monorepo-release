import { execSync } from 'child_process';

export function exec<T extends boolean = false>(command: string, encode: T): T extends true ? string : Buffer  {
    return execSync(command, { encoding: encode ? 'utf-8' : undefined }) as T extends true ? string : Buffer ;
}