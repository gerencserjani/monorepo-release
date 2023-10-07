export function utilString(): string {
  return 'util-string';
}


export class StringUtil {
  static hello(): string {
    return 'Hello';
  }

  static world(): string {
    console.log("sas2sss")
    return "Worlddddddddddddddssss3s";
  }

  static h(): string {
    return StringUtil.hello() + " " + StringUtil.world() + "!";
  }
}