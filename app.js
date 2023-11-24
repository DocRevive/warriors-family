const http = require('http');
const qs = require('querystring');
const consanguinity = require('./consanguinity');
const lineage = require('./lineage');
const data = require('./data');
const utils = require('./utils');

function generateIntersectStrings(mode, lineages1, lineages2, countAdopted) {
  const result = [];

  for (const line1 of lineages1) {
    for (const line2 of lineages2) {
      result.push('-------------------');
      if (mode === 0) {
        const resolution = consanguinity.determine(
          line1,
          data.genders[line1.youngestMember],
          line2,
          data.genders[line2.youngestMember],
          countAdopted,
          true,
          false,
        );
        result.push(...resolution.result);
        if (!resolution.isFull.result) result.push('', resolution.isFull.reason);
      } else {
        if (line1.size > 1) {
          result.push(consanguinity.determine(
            new lineage.Line([line1.oldestMember]),
            data.genders[line1.oldestMember],
            line1,
            data.genders[line1.youngestMember],
            countAdopted,
            true,
            false,
          ).result[0]);
        }
        if (line2.size > 1) {
          result.push(consanguinity.determine(
            new lineage.Line([line2.oldestMember]),
            data.genders[line2.oldestMember],
            line2,
            data.genders[line2.youngestMember],
            countAdopted,
            true,
            false,
          ).result[0]);
        }
      }

      result.push('');
      if (line1.size > 1) result.push(line1.toString());
      if (line2.size > 1) result.push(line2.toString());
    }
  }

  return result;
}

function validateUserInput(input) {
  let char = utils.fixCharInput(input);

  if (!(char in data.parents)) {
    const fixed = utils.fixUserInput(char);
    if (fixed.length === 1) {
      [char] = fixed;
    } else if (fixed.length > 1) {
      return {
        success: false,
        message: `Please clarify the character: ${fixed.map(utils.nameToLink).join(' or ')}`,
      };
    } else {
      return {
        success: false,
        message: `Couldn't find the character '${char}'! Please use a name from the list on the left.`,
      };
    }
  }

  return { success: true, fixed: char };
}

http.createServer((request, res) => {
  if (request.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    let req = '';

    request.on('data', (chunk) => {
      req += chunk;
      if (req.length > 1e6) request.destroy();
    });

    request.on('end', () => {
      const query = qs.parse(req);

      const respond = (success, output) => {
        res.end(JSON.stringify({
          action: query.action,
          success,
          output,
        }));
      };

      if (!('countAdopted' in query)) query.countAdopted = false;
      query.countAdopted = query.countAdopted === 'on';

      if (Number.isInteger(parseInt(query.action, 10))) {
        query.action = parseInt(query.action, 10);
      } else {
        respond(false, 'Invalid action.');
        return;
      }

      try {
        if ('char' in query) {
          let char = validateUserInput(query.char);
          if (!char.success) {
            respond(false, char.message);
            return;
          }
          char = char.fixed;

          if (query.action === 0 || query.action === 1) { // Ancestors/descendants
            const lineageResult = lineage.findLineage(query.action, char, query.countAdopted);
            const lineageObj = lineageResult.lineage;
            const lineageTableData = {};

            for (const member of lineageResult.members) {
              const result = [];
              const lines = lineageObj.linesFor(member);

              for (const line of lines) {
                const label = query.action === 0
                  ? consanguinity.determine(
                    new lineage.Line([line.oldestMember]),
                    data.genders[line.oldestMember],
                    line,
                    data.genders[line.oldestMember],
                    query.countAdopted,
                    false,
                    true,
                  ).result[0]
                  : consanguinity.determine(
                    line,
                    data.genders[line.youngestMember],
                    new lineage.Line([line.oldestMember]),
                    data.genders[line.oldestMember],
                    query.countAdopted,
                    false,
                    true,
                  ).result[0];
                result.push(label);
              }

              lineageTableData[member] = {
                labels: result,
                lineages: lines.map((line) => line.toString()),
              };
            }

            respond(true, lineageTableData);
            return;
          }

          if (query.action === 4) {
            const lines = [`Directly associated, stored data for ${utils.nameToLink(char)}:`, ''];
            const genders = ['male', 'female', 'unknown'];
            const parentKeysAndNames = [['mother', 'Mother'], ['father', 'Father'], ['adoptedMother', 'Adoptive mother'], ['adoptedFather', 'Adoptive father']];

            lines.push(`Sex: ${genders[data.genders[char]]}`);
            lines.push(`Mates: ${data.mates[char].length > 0 ? data.mates[char].map(utils.nameToLink).join(', ') : 'none'}`);

            if (char in data.parents) {
              for (const [key, name] of parentKeysAndNames) {
                if (key in data.parents[char]) lines.push(`${name}: ${utils.nameToLink(data.parents[char][key])}`);
              }
            }

            if ('children' in data.children[char]) lines.push(`Children: ${data.children[char].children.map(utils.nameToLink).join(', ')}`);
            else lines.push('Children: none');

            respond(true, lines.join('<br>'));
            return;
          }
        }

        if ('char1' in query && 'char2' in query) {
          let char1 = validateUserInput(query.char1);
          let char2 = validateUserInput(query.char2);
          if (!char1.success) {
            respond(false, char1.message);
            return;
          }
          if (!char2.success) {
            respond(false, char2.message);
            return;
          }
          char1 = char1.fixed;
          char2 = char2.fixed;

          if (query.action === 2 || query.action === 3) {
            const linIResult = lineage.findLineageIntersection(
              query.action - 2,
              char1,
              char2,
              query.countAdopted,
            );

            const names = `${utils.nameToLink(char1)} and ${utils.nameToLink(char2)}`;

            if (linIResult.commonMember === undefined) {
              if (query.action === 2) {
                respond(true, `${names} have no known common ancestors. They aren't related by blood.`);
                return;
              }

              respond(true, `${names} have no known common descendants. Their lines haven't intersected.`);
              return;
            }

            const strs = generateIntersectStrings(
              query.action - 2,
              linIResult.char1Lineages,
              linIResult.char2Lineages,
              query.countAdopted,
            ).join('<br>');

            if (query.action === 2) {
              respond(true, `${names}'s last common ancestor is ${linIResult.commonMember}.<br>${strs}`);
              return;
            }

            respond(true, `${names}'s most recent common descendant is ${linIResult.commonMember}.<br>${strs}`);
            return;
          }
        }

        respond(false, 'Something went wrong! Try again.');
      } catch (e) {
        console.error(e);
        respond(false, 'Error!');
      }
    });
  } else {
    res.writeHead(403);
    res.end('403 Forbidden');
  }
}).listen();

module.exports = {
  generateIntersectStrings,
  validateUserInput,
};
