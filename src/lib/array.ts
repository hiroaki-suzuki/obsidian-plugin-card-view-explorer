export const toggleInArray = <T>(list: readonly T[], item: T): T[] => {
  const contains = list.some((x) => Object.is(x, item));
  return contains ? list.filter((x) => !Object.is(x, item)) : [...list, item];
};
