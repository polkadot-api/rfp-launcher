// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sum = <T extends number | bigint>(a: T, b: T): T => (a as any) + b;
