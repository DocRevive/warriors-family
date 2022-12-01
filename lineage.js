const data = require('./data');

/**
 * Provides functionality to traverse lineages, find intersections, and
 * determine half relationships.
 * @module lineage
 */

/**
 * Represents a lineage "tree" pointing to a single character.
 * All lines in the lineage either start or end with the character.
 */
class Lineage {
  object = {};
  initialChar;

  /**
   * Create a lineage object for a character.
   * @param {string} initialChar The character name.
   */
  constructor(initialChar) {
    const line = new Line([initialChar]);
    this.object[initialChar] = [line];
    this.initialChar = initialChar;
  }

  /**
   * Determines whether the lineage already has a certain line.
   * @param {Line} lineToFind The Line to check for.
   * @returns {boolean} Whether the line is in the lineage.
   */
  includes(lineToFind) {
    const str = lineToFind.toString();
    const char = lineToFind.youngestMember === this.initialChar
      ? lineToFind.oldestMember : lineToFind.youngestMember;
    return this.object[char]?.some(line => line.toString() === str);
  }

  /**
   * Adds a line to the lineage.
   * @param {Line} line The Line to add. 
   */
  addLine(line) {
    if (this.includes(line)) return;
    const char = line.youngestMember === this.initialChar ? line.oldestMember : line.youngestMember;
    if (char in this.object) {
      this.object[char].push(line);
    } else {
      this.object[char] = [line];
    }
  }

  /**
   * Returns all lines that connect a given character to the
   * initial character.
   * @param {string} char Any character name.
   * @returns {Array<Line>} Array of lines.
   */
  linesFor(char) {
    return this.object[char];
  }
}

/**
 * Represents an individual line of ancestry or descent; from
 * first to last is oldest to newest.
 */
class Line {
  /**
   * Create a line.
   * @param {Array<string>} array Initial array of character names, the
   *      first element being the character in the oldest generation,
   *      and the last element that in the newest generation. 
   */
  constructor(array) {
    this.array = array;
  }

  /**
   * Clone this line.
   * @returns {Line} New copy of the current line.
   */
  clone() {
    const newArr = [...this.array];
    return new Line(newArr);
  }

  /**
   * @type {number}
   */
  get size() {
    return this.array.length;
  }

  /**
   * @type {string}
   */
  get youngestMember() {
    return this.array[this.array.length - 1];
  }

  /**
   * @type {string}
   */
  get oldestMember() {
    return this.array[0];
  }

  /**
   * Returns a string representation of the line that has '->' in
   * between each character name.
   * @returns {string} The line as a string.
   */
  toString() {
    return this.array.join('->');
  }

  /**
   * Add a member to the end of this line, signifying the child of
   * the current last, or youngest, character in the line.
   * @param {string} childName Name of the child.
   */
  addChild(childName) {
    this.array.push(childName);
  }

  /**
   * Add a parent to the end of this line, signifying the parent of
   * the current first, or oldest, character in the line.
   * @param {string} parentName Name of the parent. 
   */
  addParent(parentName) {
    this.array.unshift(parentName);
  }
}

/**
 * Returns an array of the names of all of the parents of a character.
 * @param {string} char Name of the character to get the parents of.
 * @param {boolean} countAdopted Whether to include adoptive parents.
 * @returns {Array<string>} An array of the parents' names.
 */
function getParents(char, countAdopted) {
  const result = [];
  const rltn = data.parents[char];

  if ('mother' in rltn) result.push(rltn.mother);
  if ('father' in rltn) result.push(rltn.father);
  if (countAdopted) {
    if ('adoptedMother' in rltn) result.push(rltn.adoptedMother);
    if ('adoptedFather' in rltn) result.push(rltn.adoptedFather);
  }

  return result;
}

/**
 * Returns all children of a character.
 * @param {string} char Name of the character to get the children of.
 * @param {boolean} countAdopted Whether to include adoptive children.
 * @returns {Array<string>} An array of the children's names.
 */
function getChildren(char, countAdopted) {
  const result = [];
  const rltn = data.children[char];

  if ('children' in rltn) result.push(...rltn.children);
  if (countAdopted) {
    if ('adoptedChildren' in rltn) result.push(...rltn.adoptedChildren);
  }

  return result;
}

/**
 * Returns all members of the next generation (parents if mode is 0, children
 * if mode is 1), and adds each of their lineages to lineageObject in place.
 * @param {0|1} mode 0: find ancestors; 1: find descendants
 * @param {Array<string>} currentGen all character names in the current generation 
 * @param {Lineage} lineage lineage object of character
 * @param {boolean} countAdopted whether to include adoption
 * @returns {Array<string>} all character names in the next generation, forward or
 *      backward in time depending on mode
 */
function findNextUpdateLineage(mode, currentGen, lineage, countAdopted) {
  const allNext = [];

  if (mode === 0) { // Parents/Ancestors
    currentGen.forEach((char) => {
      if (char in data.parents) {
        getParents(char, countAdopted).forEach((parent) => {
          allNext.push(parent);
          for (const line of lineage.linesFor(char)) {
            const newLine = line.clone();
            newLine.addParent(parent);
            lineage.addLine(newLine);
          }
        });
      }
    });
  } else { // Children/Descendants
    currentGen.forEach((char) => {
      if (char in data.children) {
        getChildren(char, countAdopted).forEach((child) => {
          allNext.push(child);
          for (const line of lineage.linesFor(char)) {
            const newLine = line.clone();
            newLine.addChild(child);
            lineage.addLine(newLine);
          }
        });
      }
    });
  }

  return allNext;
}

/**
 * Find complete lineage -- ancestry or descent -- data for a particular
 * character.
 * @param {0|1} mode 0: find ancestors; 1: find descendants.
 * @param {string} char Character to build lineage for.
 * @param {boolean} countAdopted Whether to include adoptive relationships.
 * @returns {Object} An object. with lineage: Lineage object; members: array of
 *      all unique characters in the lineage.
 */
exports.findLineage = (mode, char, countAdopted) => {
  const lineage = new Lineage(char);
  let lastIteration = [char];
  const members = new Set(lastIteration);

  while (lastIteration.length > 0) {
    lastIteration = findNextUpdateLineage(mode, lastIteration, lineage, countAdopted);
    lastIteration.forEach(members.add, members);
  }

  return { lineage, members: Array.from(members) };
};

/**
 * Find the intersection of lineages, that is, the most recent common
 * ancestor or oldest common descentant, for two characters
 * @param {0|1} mode 0: find common ancestor; 1: find common descendant.
 * @param {string} char1 First character to link.
 * @param {string} char2 Second character to link.
 * @param {boolean} countAdopted Whether to include adoptive relationships.
 * @returns {Object} An object. commonMember: name of closest common
 *      relative; char1Lineages: array of Lines connecting char1 and 
 *      commonMember; char2Lineages: array of Lines connecting char2
 *      and commonMember.
 */
exports.findLineageIntersection = (mode, char1, char2, countAdopted) => {
  const linResult = this.findLineage(mode, char1, countAdopted);
  const char2Lineage = new Lineage(char2);
  let lastIteration = [char2];
  let commonMember;

  while (lastIteration.length > 0) {
    if (!commonMember) {
      for (const member of lastIteration) {
        if (linResult.members.includes(member)) {
          commonMember = member;
          break;
        }
      }
    }

    // Continue to identify all lines between char2 and commonMember
    lastIteration = findNextUpdateLineage(mode, lastIteration, char2Lineage, countAdopted);
  }

  return {
    commonMember,
    char1Lineages: linResult.lineage.linesFor(commonMember),
    char2Lineages: char2Lineage.linesFor(commonMember),
  };
};

/**
 * Determines whether a relationship between two characters is "full." If it is not,
 * it is "half" (e.g. half-brother), signifying the last common ancestor had different
 * partners for the two characters.
 * Assumes that at least one ancestor is shard and the known common ancestor's mate
 * is of the opposite sex.
 * @param {Line} char1Line A line between the first character and the common ancestor
 * @param {Line} char2Line A line between the second character and the common ancestor
 * @param {boolean} countAdopted Whether to include adoptive relationships.
 * @returns {Object} An object. result: true if full, false if half; reason: empty if
 *      full, reasoning if half.
 */
exports.isFullRelationship = (char1Line, char2Line, countAdopted) => {
  const output = { isFull: true, char1Parent: null, char2Parent: null };

  if (char1Line.size === 1 || char2Line.size === 1) return { result: true, reason: '' };

  const c1AncRltn = data.parents[char1Line.array[1]];
  const c2AncRltn = data.parents[char2Line.array[1]];
  const ca = char1Line.oldestMember;
  const propsList = [['father', 'adoptedFather'], ['mother', 'adoptedMother']];
  const props = data.genders[ca] ? propsList[0] : propsList[1];
  const propsI = data.genders[ca] ? propsList[1] : propsList[0];

  if (!(
    c1AncRltn[props[0]] === c2AncRltn[props[0]]
    || (countAdopted
      && (c1AncRltn[props[0]] === c2AncRltn[props[1]]
        || c1AncRltn[props[1]] === c2AncRltn[props[0]]
        || c1AncRltn[props[1]] === c2AncRltn[props[1]])
      && c1AncRltn[props[1]] !== undefined
    ))) {
    output.isFull = false;
    if (!countAdopted) {
      output.char1Parent = c1AncRltn[props[0]];
      output.char2Parent = c2AncRltn[props[0]];
    } else {
      output.char1Parent = c1AncRltn[propsI[0]] === ca ? c1AncRltn[props[0]] : c1AncRltn[props[1]];
      output.char2Parent = c2AncRltn[propsI[0]] === ca ? c2AncRltn[props[0]] : c2AncRltn[props[1]];
    }
  }

  if (output.isFull) return { result: true, reason: '' };

  if (output.char1Parent === undefined) output.char1Parent = 'unknown';
  if (output.char2Parent === undefined) output.char2Parent = 'unknown';

  return {
    result: false,
    reason: `The relationship is half because ${char1Line.youngestMember} is descended from ${output.char1Parent} and ${ca} while ${char2Line.youngestMember} is descended from ${output.char2Parent} and ${ca}.`,
  };
};

exports.Line = Line;
