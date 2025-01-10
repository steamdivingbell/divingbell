// "Default", aka more like this: https://store.steampowered.com/recommended/morelike/app/210970
// This might need some revamping in the new system, since there's now (9 + 6 + 3 + 9) games listed on the store page.
function default_matches(gameId) {
  return Array.from(globalGameData.get(gameId).similar)
}

// "Reverse" is just "more like this" but inverse-lookup, which we have already indexed
function reverse_matches(gameId) {
  return Array.from(globalGameData.get(gameId).reverse)
}

// "Loose" is a 2x 'default' match, excluding the default matches themselves.
function loose_matches(gameId) {
  var siblings = globalGameData.get(gameId).similar
  var grandSiblings = new Set()
  for (var sibling of siblings) {
    for (var grandSibling of globalGameData.get(sibling).similar) {
      grandSiblings.add(grandSibling)
    }
  }
  
  // All second children who aren't immediate children or ourselves
  var results = []
  for (var grandSibling of grandSiblings) {
    if (grandSibling == gameId) continue
    if (siblings.has(grandSibling)) continue
    results.push(grandSibling)
  }

  return sort_games_by_tags(results, gameId)
}

// "Tags" is not too bad, although it requires a custom weighting which needs to be recomputed for each game. Caching?
// TODO: According to mr. diving bell, "It starts by taking a subset of games that have *at least one matching tag in a major category* and then ranks them all."
//       so I might need some culling for the actual recommender
function tag_matches(gameId) {
  var importantTags = new Set()
  for (var tag of globalGameData.get(gameId).tags) {
    if (globalTagData[tag].weight > 4) importantTags.add(tag)
  }
  var games = []
  for (var [game, data] of globalGameData.entries()) {
    if (game == gameId) continue // Don't recommend the current game
    for (var tag of importantTags) {
      if (data.tags.has(tag)) {
        games.push(game)
        break
      }
    }
  }

  console.info('tag_matches', games)

  return sort_games_by_tags(games, gameId)
}

// "Hidden gems" is the tags matcher but only for games above some % rating and below some # total ratings. Not sure what those numbers are, yet.
function gem_matches(gameId) {
  var games = []
  for (var [game, data] of globalGameData.entries()) {
    if (game == gameId) continue // Don't recommend the current game
    if (data.perc > 0.80 && data.total < 500) games.push(game)
  }

  return sort_games_by_tags(games, gameId)
}

// Used in many places for tie breaks, also used directly for the tag recommender
function sort_games_by_tags(games, gameId) {
  // Inverse sort so that the largest numbers (highest matches) are topmost. Ties broken by % positive rating.
  games.sort((a, b) => Math.sign(compare_candidates(gameId, b) - compare_candidates(gameId, a)) || Math.sign(globalGameData.get(a).perc - globalGameData.get(b).perc))
  return games
}
