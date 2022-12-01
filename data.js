const fs = require('fs');

const options = { encoding: 'utf-8' };

module.exports = {
  parents: JSON.parse(fs.readFileSync('data/parents.json', options)),
  children: JSON.parse(fs.readFileSync('data/children.json', options)),
  genders: JSON.parse(fs.readFileSync('data/genders.json', options)),
  mates: JSON.parse(fs.readFileSync('data/mates.json', options)),
  names: JSON.parse(String(fs.readFileSync('js/names.js', options)).slice(14, -1)),
};
