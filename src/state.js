export const PALETTE = [
  '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF',
  '#BDB2FF', '#FFC6FF', '#F5C6A0', '#D0F4DE', '#FFADAD'
];

export const state = {
  groups: [],
  mode: 'filter',
  input: ''
};

const subs = new Set();
export const subscribe = fn => subs.add(fn);
export const notify = () => subs.forEach(fn => fn());
