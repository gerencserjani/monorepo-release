export function utilString(): string {
  return 'util-string';
}


export class StringUtil {
  static hello(): string {
    return 'Hello';
  }

  static world(): string {
    return "World";
  }

  static helloWorld(): string {
    return `${StringUtil.hello()} ${StringUtil.world()}`;
  }
}