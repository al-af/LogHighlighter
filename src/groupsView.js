import { PALETTE, state } from './state.js';
import { removeGroup, removeKeyword } from './groups.js';

export function renderGroups() {
  const container = document.getElementById('groups');
  container.innerHTML = '';
  state.groups.forEach((g, gi) => {
    const row = document.createElement('div');
    row.className = 'group';

    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.background = PALETTE[g.colorIndex];

    const kws = document.createElement('div');
    kws.className = 'kws';
    g.keywords.forEach((k, ki) => {
      const chip = document.createElement('span');
      chip.className = 'kw-chip';
      chip.appendChild(document.createTextNode(k));
      const x = document.createElement('button');
      x.textContent = '×';
      x.title = 'remove keyword';
      x.onclick = () => removeKeyword(gi, ki);
      chip.appendChild(x);
      kws.appendChild(chip);
    });

    const rm = document.createElement('button');
    rm.className = 'remove';
    rm.textContent = '×';
    rm.title = 'remove group';
    rm.onclick = () => removeGroup(gi);

    row.append(swatch, kws, rm);
    container.appendChild(row);
  });
}
