const list = document.getElementById('nameList');
const lineage = document.getElementById('lineage');
const intersections = document.getElementById('intersections');
const search = document.getElementById('search');

const nameToUrl = (name) => `https://warriors.fandom.com/wiki/${name.replace(/ /g, '_')}`;
const fixMinorName = (name) => (name.includes('#') ? name.split('#')[1] : name);

Object.values(names).forEach((name) => {
  const el = document.createElement('li');
  const nameText = document.createTextNode(fixMinorName(name));

  el.setAttribute('name', name);
  if (!name.includes('Unnamed Mother')) {
    const a = document.createElement('a');
    a.setAttribute('href', nameToUrl(name));
    a.setAttribute('target', '_blank');
    a.appendChild(nameText);
    el.appendChild(a);
  } else el.appendChild(nameText);
  list.appendChild(el);
});

function request(form, qs) {
  const outputCont = form.getElementsByClassName('output')[0];
  outputCont.classList.add('gray');
  outputCont.innerHTML = 'Loading...';

  const xhttp = new XMLHttpRequest();
  xhttp.open('POST', 'controller');
  xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhttp.send(qs);

  xhttp.onreadystatechange = () => {
    if (xhttp.readyState === 4 && xhttp.status === 200) {
      const response = JSON.parse(xhttp.responseText);
      outputCont.classList.remove('gray');
      if (response.success) {
        if (typeof response.output === 'string') {
          outputCont.innerHTML = response.output;
        } else {
          let build = `<table>
            <thead>
              <th>Character</th>
              <th>Relationship</th>
              <th>Lineage</th>
            </thead>
            <tbody>`;
          Object.entries(response.output).forEach(([key, value]) => {
            build += '<tr><td>';
            build += key.includes('Unnamed Mother') ? key : `<a href="${nameToUrl(key)}">${fixMinorName(key)}</a>`;
            build += `</td><td>${value.labels.join('<br>')}</td><td>${value.lineages.join('<br>')}</td></tr>`;
          });
          build += '</tbody></table>';
          outputCont.innerHTML = build;
        }
      } else {
        outputCont.innerHTML = response.output;
      }
    }
  };
}

function submit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = [...formData.entries()];
  const asString = data
    .map((x) => `${encodeURIComponent(x[0])}=${encodeURIComponent(x[1])}`)
    .join('&');
  request(e.target, asString);
}

function filter(e) {
  const lower = e.target.value.toLowerCase();
  for (const el of list.children) {
    if (el.attributes[0].nodeValue.toLowerCase().includes(lower)) {
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }
}

search.oninput = filter;
lineage.onsubmit = submit;
intersections.onsubmit = submit;
