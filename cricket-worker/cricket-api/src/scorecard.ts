import { extractText, getDocumentProxy } from 'unpdf';

export interface ImportedPerformance {
  sourceName: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
  maidenOvers: number;
  isOut: boolean;
  notOuts: number;
  dismissalType: string | null;
}

export interface ParsedInnings {
  teamName: string;
  score: string;
  overs: number;
  batting: ImportedPerformance[];
  bowling: ImportedPerformance[];
}

export interface ParsedScorecard {
  team1: string;
  team2: string;
  team1CaptainName: string;
  team2CaptainName: string;
  result: string;
  innings: [ParsedInnings, ParsedInnings];
}

const BATTING_HEADER = 'Batsman R B 4s 6s SR';
const BOWLING_HEADER = 'Bowler O M R W ER';

function ballsFromOvers(overs: string): number {
  const match = /^(\d+)\.(\d)$/.exec(overs);
  if (!match || Number(match[2]) > 5) {
    throw new Error(`Invalid bowling overs value: "${overs}".`);
  }
  return Number(match[1]) * 6 + Number(match[2]);
}

function dismissalType(dismissal: string): string | null {
  if (dismissal === 'not out') return null;
  if (dismissal.startsWith('c ')) return 'caught';
  if (dismissal.startsWith('b ')) return 'bowled';
  if (dismissal.includes('run out')) return 'run out';
  if (dismissal.includes('stumped')) return 'stumped';
  if (dismissal.includes('lbw')) return 'lbw';
  return 'other';
}

function parseInnings(teamName: string, text: string): ParsedInnings {
  const total = text.match(/Total\s+(\d+-\d+)\s+\((\d+\.\d+)\)/);
  if (!total) throw new Error(`Could not find the total for ${teamName}.`);

  const battingEnd = text.indexOf('\nExtras ');
  const bowlingStart = text.indexOf(BOWLING_HEADER);
  if (battingEnd < 0 || bowlingStart < 0) {
    throw new Error(`Could not find batting or bowling tables for ${teamName}.`);
  }

  const battingLines = text
    .slice(text.indexOf(BATTING_HEADER) + BATTING_HEADER.length, battingEnd)
    .trim()
    .split('\n');
  const batting: ImportedPerformance[] = [];
  for (let index = 0; index + 2 < battingLines.length; index += 3) {
    const sourceName = battingLines[index].trim();
    const dismissal = battingLines[index + 1].trim();
    const values = battingLines[index + 2].trim().split(/\s+/);
    if (sourceName === 'Extra' || values.length !== 5) continue;
    const [runs, ballsFaced, fours, sixes] = values.map(Number);
    if (![runs, ballsFaced, fours, sixes].every(Number.isInteger)) {
      throw new Error(`Could not read batting figures for ${sourceName}.`);
    }
    batting.push({
      sourceName, runs, ballsFaced, fours, sixes,
      ballsBowled: 0, runsConceded: 0, wickets: 0, maidenOvers: 0,
      isOut: dismissal !== 'not out', notOuts: dismissal === 'not out' ? 1 : 0,
      dismissalType: dismissalType(dismissal)
    });
  }

  const bowlingEnd = text.indexOf('\nFall of wickets', bowlingStart);
  const bowlingLines = text
    .slice(bowlingStart + BOWLING_HEADER.length, bowlingEnd < 0 ? undefined : bowlingEnd)
    .trim()
    .split('\n');
  const bowling: ImportedPerformance[] = bowlingLines.map(line => {
    const values = line.trim().split(/\s+/);
    if (values.length !== 6 || ![values[2], values[3], values[4]].every(value => Number.isInteger(Number(value)))) {
      throw new Error(`Could not read bowling figures: "${line}".`);
    }
    return {
      sourceName: values[0], runs: 0, ballsFaced: 0, fours: 0, sixes: 0,
      ballsBowled: ballsFromOvers(values[1]), runsConceded: Number(values[3]),
      wickets: Number(values[4]), maidenOvers: Number(values[2]),
      isOut: false, notOuts: 0, dismissalType: null
    };
  });

  return { teamName, score: total[1], overs: Number(total[2]), batting, bowling };
}

export async function parseScorecardPdf(pdfBytes: ArrayBuffer): Promise<ParsedScorecard> {
  if (pdfBytes.byteLength === 0) throw new Error('The uploaded PDF is empty.');
  const pdf = await getDocumentProxy(new Uint8Array(pdfBytes), { maxImageSize: 16_777_216 });
  if (pdf.numPages > 10) throw new Error('Scorecard PDFs are limited to 10 pages.');
  const extracted = await extractText(pdf);
  const pages = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
  const text = pages.join('\n');
  const title = text.match(/^(.+?)\s+v\/s\s+(.+)$/m);
  const result = text.match(/^(.+? won by .+?)\.$/m);
  if (!title || !result) throw new Error('This PDF does not look like a supported cricket scorecard.');

  const battingStarts = [...text.matchAll(new RegExp(BATTING_HEADER, 'g'))].map(match => match.index as number);
  if (battingStarts.length !== 2) {
    throw new Error('The scorecard must contain exactly two innings.');
  }
  const firstPreamble = text.slice(0, battingStarts[0]);
  const firstHeader = firstPreamble.match(new RegExp(`^${title[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+\\d+-\\d+\\s+\\(\\d+\\.\\d+\\)$`, 'm'));
  if (!firstHeader) throw new Error(`Could not find the first innings for ${title[1]}.`);

  const firstBlock = `${BATTING_HEADER}${text.slice(battingStarts[0] + BATTING_HEADER.length, battingStarts[1])}`;
  const secondBlock = `${BATTING_HEADER}${text.slice(battingStarts[1] + BATTING_HEADER.length)}`;
  return {
    team1: title[1].trim(),
    team2: title[2].trim(),
    // The supported scorecard format titles a match as "Captain v/s Captain".
    team1CaptainName: title[1].trim(),
    team2CaptainName: title[2].trim(),
    result: result[1],
    innings: [
      parseInnings(title[1].trim(), firstBlock),
      parseInnings(title[2].trim(), secondBlock)
    ]
  };
}

export function normaliseScorecardName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]++;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[b.length];
}

function sharedPrefixLength(left: string, right: string): number {
  let length = 0;
  while (length < left.length && length < right.length && left[length] === right[length]) {
    length++;
  }
  return length;
}

function playerNameScore(sourceName: string, playerName: string): number {
  const source = normaliseScorecardName(sourceName);
  const tokens = playerName.split(/\s+/).map(normaliseScorecardName).filter(Boolean);
  if (!source || tokens.length === 0) return 0;

  return Math.max(...tokens.map(token => {
    if (token === source) return 100;

    const editScore = Math.round(
      (1 - levenshtein(source, token) / Math.max(source.length, token.length, 1)) * 100
    );
    const sharedPrefix = sharedPrefixLength(source, token);
    const prefixScore = sharedPrefix >= 3
      ? Math.round((sharedPrefix / source.length) * 90)
      : 0;
    return Math.max(editScore, prefixScore);
  }));
}

function playerSuggestions(
  sourceName: string,
  players: Array<{ Player_ID: string; Name: string }>
) {
  return players.map(player => {
    const score = playerNameScore(sourceName, player.Name);
    return { playerId: player.Player_ID, playerName: player.Name, score: Math.max(0, score) };
  }).sort((left, right) => right.score - left.score).slice(0, 3);
}

export function scorecardAssociationNames(scorecard: ParsedScorecard): string[] {
  const names = new Set<string>();
  scorecard.innings.forEach(innings => {
    innings.batting.forEach(performance => names.add(performance.sourceName));
    innings.bowling.forEach(performance => names.add(performance.sourceName));
  });

  const addCaptainName = (name: string | undefined, fallback: string) => {
    const captainName = name?.trim() || fallback.trim();
    const normalisedCaptainName = normaliseScorecardName(captainName);
    const alreadyIncluded = normalisedCaptainName
      && [...names].some(playerName => normaliseScorecardName(playerName) === normalisedCaptainName);
    if (!alreadyIncluded) names.add(captainName);
  };

  addCaptainName(scorecard.team1CaptainName, scorecard.team1);
  addCaptainName(scorecard.team2CaptainName, scorecard.team2);
  return [...names].sort();
}

export function resolveMappedPlayerId(
  mappings: ReadonlyMap<string, string>,
  sourceName: string
): string | null {
  const exactPlayerId = mappings.get(sourceName);
  if (exactPlayerId) return exactPlayerId;

  const normalisedSourceName = normaliseScorecardName(sourceName);
  if (!normalisedSourceName) return null;

  const matchingPlayerIds = new Set<string>();
  mappings.forEach((playerId, mappedSourceName) => {
    if (normaliseScorecardName(mappedSourceName) === normalisedSourceName) {
      matchingPlayerIds.add(playerId);
    }
  });
  return matchingPlayerIds.size === 1 ? [...matchingPlayerIds][0] : null;
}

export function suggestPlayerMatches(
  scorecard: ParsedScorecard,
  players: Array<{ Player_ID: string; Name: string }>
) {
  return scorecardAssociationNames(scorecard).map(sourceName => {
    return { sourceName, suggestions: playerSuggestions(sourceName, players) };
  });
}

export interface ManOfTheMatchPerformance {
  playerId: string;
  runs: number;
  ballsFaced: number;
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
  maidenOvers: number;
}

/**
 * Mirrors the established in-app Man of the Match score so imports and
 * manually scored matches use the same batting, bowling, and winner weighting.
 */
export function calculateImportedManOfTheMatch(
  performances: ManOfTheMatchPerformance[],
  winningPlayerIds: Set<string>
): string | null {
  let winner: { playerId: string; points: number } | null = null;

  for (const performance of performances) {
    let points = winningPlayerIds.has(performance.playerId) ? 1 : 0;
    points += performance.runs / 10;

    if (performance.ballsFaced >= 10 && performance.runs / performance.ballsFaced * 100 > 100) {
      points += 0.25;
    }

    points += performance.wickets;
    points += performance.maidenOvers * 0.5;

    if (performance.ballsBowled > 0) {
      const economy = performance.runsConceded / (performance.ballsBowled / 6);
      if (economy < 7) points += (7 - economy) * 0.5;
    }

    if (!winner || points > winner.points) {
      winner = { playerId: performance.playerId, points };
    }
  }

  return winner?.playerId || null;
}

/**
 * Produces a stable representation of the parsed source data. It deliberately
 * excludes roster mappings, so selecting a different player association cannot
 * turn the same scorecard into a second imported match.
 */
export function canonicalScorecardContent(scorecard: ParsedScorecard): string {
  const normalisePerformance = (performance: ImportedPerformance) => ({
    sourceName: performance.sourceName.trim(),
    runs: performance.runs,
    ballsFaced: performance.ballsFaced,
    fours: performance.fours,
    sixes: performance.sixes,
    ballsBowled: performance.ballsBowled,
    runsConceded: performance.runsConceded,
    wickets: performance.wickets,
    maidenOvers: performance.maidenOvers,
    isOut: performance.isOut,
    notOuts: performance.notOuts,
    dismissalType: performance.dismissalType
  });
  const normalisePerformances = (performances: ImportedPerformance[]) => performances
    .map(normalisePerformance)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

  return JSON.stringify({
    team1: scorecard.team1.trim(),
    team2: scorecard.team2.trim(),
    result: scorecard.result.trim(),
    innings: scorecard.innings.map(innings => ({
      teamName: innings.teamName.trim(),
      score: innings.score,
      overs: innings.overs,
      batting: normalisePerformances(innings.batting),
      bowling: normalisePerformances(innings.bowling)
    }))
  });
}
