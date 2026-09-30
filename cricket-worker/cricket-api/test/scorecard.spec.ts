import { describe, expect, it } from 'vitest';
import {
  calculateImportedManOfTheMatch,
  canonicalScorecardContent,
  resolveMappedPlayerId,
  scorecardAssociationNames,
  suggestPlayerMatches,
  type ImportedPerformance,
  type ParsedScorecard
} from '../src/scorecard';

const emptyPerformance = (sourceName: string): ImportedPerformance => ({
  sourceName,
  runs: 0,
  ballsFaced: 0,
  fours: 0,
  sixes: 0,
  ballsBowled: 0,
  runsConceded: 0,
  wickets: 0,
  maidenOvers: 0,
  isOut: false,
  notOuts: 0,
  dismissalType: null
});

const scorecard: ParsedScorecard = {
  team1: 'Chiru',
  team2: 'Rahul',
  team1CaptainName: 'Chiru',
  team2CaptainName: 'Rahul',
  result: 'Rahul won by 2 wickets',
  innings: [
    {
      teamName: 'Chiru',
      score: '152-8',
      overs: 20,
      batting: [emptyPerformance('Anuj'), emptyPerformance('Chiru')],
      bowling: []
    },
    {
      teamName: 'Rahul',
      score: '153-8',
      overs: 18.3,
      batting: [emptyPerformance('Sai')],
      bowling: []
    }
  ]
};

describe('scorecard player matching', () => {
  it('automatically recognizes a scorecard first name in a full roster name', () => {
    const matches = suggestPlayerMatches(scorecard, [
      { Player_ID: 'anuj', Name: 'Anuj Loomba' },
      { Player_ID: 'chiru', Name: 'Chiranjeevi Dupati' },
      { Player_ID: 'sai', Name: 'Sai teja' }
    ]);

    expect(matches.find(match => match.sourceName === 'Anuj')?.suggestions[0]).toEqual({
      playerId: 'anuj',
      playerName: 'Anuj Loomba',
      score: 100
    });
    expect(matches.find(match => match.sourceName === 'Sai')?.suggestions[0]).toEqual({
      playerId: 'sai',
      playerName: 'Sai teja',
      score: 100
    });
    expect(matches.find(match => match.sourceName === 'Rahul')?.suggestions).toBeDefined();
  });

  it('adds title-only captain names to the normal player association list', () => {
    expect(scorecardAssociationNames(scorecard)).toEqual(['Anuj', 'Chiru', 'Rahul', 'Sai']);
  });

  it('uses the confirmed mapping for cosmetic captain-name differences', () => {
    expect(resolveMappedPlayerId(
      new Map([['A. Player', 'alice']]),
      'A Player'
    )).toBe('alice');
  });

  it('does not resolve an ambiguous normalized captain name', () => {
    expect(resolveMappedPlayerId(
      new Map([
        ['A Player', 'alice'],
        ['A. Player', 'bob']
      ]),
      'A-Player'
    )).toBeNull();
  });

  describe('scorecard import analytics', () => {
    it('uses the established batting, bowling, and winner weighting for Man of the Match', () => {
      expect(calculateImportedManOfTheMatch([
        {
          playerId: 'winner-batter',
          runs: 50,
          ballsFaced: 30,
          ballsBowled: 0,
          runsConceded: 0,
          wickets: 0,
          maidenOvers: 0
        },
        {
          playerId: 'loser-bowler',
          runs: 0,
          ballsFaced: 0,
          ballsBowled: 24,
          runsConceded: 12,
          wickets: 4,
          maidenOvers: 1
        }
      ], new Set(['winner-batter']))).toBe('loser-bowler');
    });

    it('creates the same import identity when performance rows are reordered', () => {
      const reordered: ParsedScorecard = {
        ...scorecard,
        innings: [
          {
            ...scorecard.innings[0],
            batting: [...scorecard.innings[0].batting].reverse()
          },
          scorecard.innings[1]
        ]
      };

      expect(canonicalScorecardContent(reordered)).toBe(canonicalScorecardContent(scorecard));
    });
  });

  it('leaves nickname-like matches below the automatic-confirmation threshold', () => {
    const matches = suggestPlayerMatches(scorecard, [
      { Player_ID: 'chiru', Name: 'Chiranjeevi Dupati' }
    ]);

    expect(matches.find(match => match.sourceName === 'Chiru')?.suggestions[0]).toMatchObject({
      playerId: 'chiru',
      score: 72
    });
  });

});
