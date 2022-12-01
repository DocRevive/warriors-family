const lineage = require('./lineage');

const numToOrdinal = (num) => {
  if (num === 1) return 'first';
  if (num === 2) return 'second';
  if (num === 3) return 'third';
  return `${num}th`;
};

const numOfTimes = (num) => {
  if (num === 1) return `once`;
  if (num === 2) return `twice`;
  return `${num} times`;
}

const parentStrings = (r, rStr, isReversed) => {
  const strings = [
    [`${r[0]} is the ${rStr}father of ${r[1]}.`, `${r[0]} is the ${rStr}mother of ${r[1]}.`, `${r[0]} is the ${rStr}parent of ${r[1]}.`],
    [`${r[1]} is the ${rStr}son of ${r[0]}.`, `${r[1]} is the ${rStr}daughter of ${r[0]}.`, `${r[1]} is the ${rStr}child of ${r[0]}.`],
  ];

  return {
    strings: isReversed ? strings.reverse() : strings,
    labelIndices: [10, -7],
  }
};

const auntuncleStrings = (r, rStr, isReversed) => {
  const strings = [
    [`${r[0]} is the ${rStr}uncle of ${r[1]}.`, `${r[0]} is the ${rStr}aunt of ${r[1]}.`, `${r[0]} is the ${rStr}aunt/uncle of ${r[1]}.`],
    [`${r[1]} is the ${rStr}nephew of ${r[0]}.`, `${r[1]} is the ${rStr}niece of ${r[0]}.`, `${r[1]} is the ${rStr}nephew/niece of ${r[0]}.`],
  ];

  return {
    strings: isReversed ? strings.reverse() : strings,
    labelIndices: [10, -7],
  }
};

/**
 * Returns general "template" strings that describe the consanguineous relationship
 * (e.g. mother, granduncle, third cousin) for two characters. Provides strings for
 * both directions, with placeheld names, and for different genders. 
 * Labels agree with this chart:
 * https://commons.wikimedia.org/wiki/File:Table_of_Consanguinity_showing_degrees_of_relationship.svg
 * @param {number} degree1 Number of generations between the first character and the
 *      last common ancestor.
 * @param {number} degree2 Number of generations between the second character and the
 *      last common ancestor.
 * @returns {Object} An object. strings: a 2D array with 1-2 rows. For 2 rows, the first
 *      belongs to the first character, and the second belongs to the second. For 1,
 *      the first describes both characters. The placeholder for the first and second
 *      characters' names are $1 and $2, respectively. There are always three columns;
 *      index 0, 1, 2 always correspond with male, female, and unknown labels for the
 *      row's character. labelIndices: array of slice indices to isolate the label in
 *      any of the strings.
 */
const generateTemplates = (degree1, degree2) => {
  let first = degree1;
  let second = degree2;
  let r = ['$1', '$2'];

  for (let i = 0; i < 2; i += 1) {
    if (first === 0) {
      switch (second) {
        case 0:
          return {
            strings: [['$1 is himself.', '$1 is herself.', '$1 is themself.']],
            labelIndices: [6, -1],
          };
        case 1:
          return parentStrings(r, '', i === 1);
        case 2:
          return parentStrings(r, 'grand', i === 1);
        default:
          return parentStrings(r, `${'great-'.repeat(second - 2)}grand`, i === 1);
      }
    }

    if (first === 1) {
      switch (second) {
        case 0:
          return parentStrings(r.reverse(), '', i !== 1);
        case 1:
          const strings = [
            [`${r[0]} is the brother of ${r[1]}.`, `${r[0]} is the sister of ${r[1]}.`, `${r[0]} is the sibling of ${r[1]}.`],
            [`${r[1]} is the brother of ${r[0]}.`, `${r[1]} is the sister of ${r[0]}.`, `${r[1]} is the sibling of ${r[0]}.`],
          ];

          return {
            strings: isReversed ? strings.reverse() : strings,
            labelIndices: [10, -7],
          }
        case 2:
          return auntuncleStrings(r, '', i === 1);
        case 3:
          return auntuncleStrings(r, 'great-', i === 1);
        default:
          return auntuncleStrings(r, `${'great-'.repeat(second - 2)}grand`, i === 1);
      }
    }

    if (first === second) {
      return {
        strings: [Array(3).fill(`$1 and $2 are ${numToOrdinal(first - 1)} cousins.`)],
        labelIndices: [14, -1],
      };
    }

    first = degree2;
    second = degree1;
    r = r.reverse();
  }

  const diff = Math.abs(first - second);
  return {
    strings: [Array(3).fill(`$1 and $2 are ${numToOrdinal(Math.min(first, second) - 1)} cousins ${numOfTimes(diff)} removed.`)],
    labelIndices: [14, -1],
  };
};

/**
 * Returns relevant consanguinity information.
 * Gender values: 0: male, 1: female, 2: unknown.
 * @param {Line} line1 Line from the first character to the common relative.
 * @param {0|1|2} gender1 Gender value of the first character.
 * @param {Line} line2 Line from the second character to the common relative.
 * @param {0|1|2} gender2 Gender value of the second character.
 * @param {boolean} countAdopted Whether to include adoptive relationships.
 * @param {boolean} putNames Whether to substitute placeholders for real character names.
 * @param {boolean} labelOnly Whether to return the labels rather than descriptive sentences.
 * @returns {Object} An object. result: array of 1 or 2 strings. isFull: same as
 *      lineage.isFullRelationship() return value.
 */
exports.determine = (line1, gender1, line2, gender2, countAdopted, putNames, labelOnly) => {
  const result = [];
  const last = [line1.size - 1, line2.size - 1];
  const csResult = generateTemplates(last[0], last[1]);
  const isFull = lineage.isFullRelationship(line1, line2, countAdopted);
  const relevantTemplates = [csResult.strings[0][gender1]];
  if (csResult.strings.length === 2) relevantTemplates.push(csResult.strings[1][gender2]);

  for (const str of relevantTemplates) {
    let next;

    if (labelOnly) {
      const label = str.slice(...csResult.labelIndices);
      next = isFull.result ? label : `half-${label}`;
    } else {
      next = isFull.result ? str
        : `${str.slice(0, csResult.labelIndices[0])}half-${str.slice(csResult.labelIndices[0])}`;
    }

    if (putNames) {
      next = next.replace(/\$1/g, line1.youngestMember)
        .replace(/\$2/g, line2.youngestMember);
    }

    result.push(next);
  }

  return { result, isFull };
}
