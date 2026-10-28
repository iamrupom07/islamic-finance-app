const purge = new Set<() => void | Promise<void>>();
export function onDevicePurge(fn: () => void | Promise<void>) {
  purge.add(fn);
  return () => {
    purge.delete(fn);
  };
}
export async function purgeDeviceState() {
  await Promise.all([...purge].map((fn) => fn()));
}
