const data = require('./data');

/**
 * Provides general functionality to generate markdown features, fix user
 * input, and simplify complex outputs.
 * @module utils
 */

/**
 * Takes a valid name, which may look like a path since they are components
 * of URLs, and returns only the name.
 * @param {string} name valid name
 * @returns {string} name without URL remnants
 */
const fixMinorName = (name) => (name.includes('#') ? name.split('#')[1] : name);

/**
 * Takes a valid name and returns an HTML anchor tag to the character's
 * page on the wiki.
 * @param {string} name valid name (full URL part)
 * @returns {string} HTML link
 */
exports.nameToLink = (name) => `<a href="https://warriors.fandom.com/wiki/${name.replace(/ /g, '_')}">${fixMinorName(name)}</a>`;

/**
 * Takes a string, capitalizes the first letter, replaces underscores
 * with spaces, and returns the result. To be used to inexpensively format
 * character fields.
 * @param {string} name user input
 * @returns {string} formatted input
 */
exports.fixCharInput = (name) => (name.charAt(0).toUpperCase() + name.slice(1)).replace(/_/g, ' ').trim();

/**
 * Gets valid name(s) from an imprecise input. If an empty array is returned,
 * the function was unable to discern a valid name.
 * @param {string} chara character field value
 * @returns {!Array<string>} an array of all possible names (or none at all)
 */
exports.fixUserInput = (chara) => {
  const charaMatch = fixMinorName(chara).toLowerCase();
  const possible = [];

  for (let i = 0; i < data.names.length; i += 1) {
    const nameLower = fixMinorName(data.names[i]).toLowerCase();
    if (nameLower === charaMatch) {
      return [data.names[i]];
    }
    if (nameLower.split(' ').includes(charaMatch)) {
      possible.push(data.names[i]);
    }
  }

  return possible;
};
