from random import shuffle

def skill_score(player):
    """
    Calculates a numerical skill score for a player.
    """
    # Assuming 'R' = Reliable, 'S' = So-So/Slogger, 'U' = Unreliable
    batting_score_map = {'R': 6, 'S': 3, 'U': 1}
    bowling_score_map = {'Fast': 5, 'Medium': 3, 'DNB': 1}

    batting_score = batting_score_map.get(player.get('batting'), 0)
    bowling_score = bowling_score_map.get(player.get('bowling'), 0)

    return batting_score + bowling_score

def balance_teams(selected_players, captain1, captain2):
    """
    Balances two teams by explicitly separating star players and distributing
    each group in a strict alternating draft.
    """
    team_a = [captain1]
    team_b = [captain2]

    other_players = [p for p in selected_players if p not in [captain1, captain2]]

    # --- FINAL CORRECTED LOGIC ---

    # 1. Separate players into two distinct lists
    star_players = [p for p in other_players if p.get('is_star', False)]
    regular_players = [p for p in other_players if not p.get('is_star', False)]

    # 2. Sort each list by skill score
    star_players.sort(key=skill_score, reverse=True)
    regular_players.sort(key=skill_score, reverse=True)

    # 3. Use a turn tracker for a strict alternating draft. 0 for Team A, 1 for Team B.
    # We start the turn based on which captain is weaker, to give them the first pick.
    turn = 0 if skill_score(captain1) <= skill_score(captain2) else 1

    # 4. Distribute star players using the turn tracker
    for player in star_players:
        if turn == 0:
            team_a.append(player)
            turn = 1  # Next turn is for Team B
        else:
            team_b.append(player)
            turn = 0  # Next turn is for Team A

    # 5. CONTINUE the draft with regular players. The 'turn' variable correctly
    # remembers whose turn it is after the stars have been distributed.
    for player in regular_players:
        if turn == 0:
            team_a.append(player)
            turn = 1
        else:
            team_b.append(player)
            turn = 0

    # Final check to ensure teams have similar size, swapping the last player if grossly imbalanced.
    # This handles edge cases with odd numbers of players.
    while abs(len(team_a) - len(team_b)) > 1:
        if len(team_a) > len(team_b):
            player_to_move = team_a.pop()
            team_b.append(player_to_move)
        else:
            player_to_move = team_b.pop()
            team_a.append(player_to_move)

    # NEW: Add Extra players who cannot bat or bowl.
    team_a.append({'name': 'Extra1', 'bowling': 'DNB', 'batting': 'U', 'is_extra_player': True})
    team_b.append({'name': 'Extra2', 'bowling': 'DNB', 'batting': 'U', 'is_extra_player': True})


    return team_a, team_b
