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
  return Array.from(grandSiblings.difference(siblings)) // remove immediate siblings from the results
}

// "Tags" is not too bad, although it requires a custom weighting which needs to be recomputed for each game. Caching?
// TODO: According to mr. diving bell, "It starts by taking a subset of games that have *at least one matching tag in a major category* and then ranks them all."
//       so I might need some culling for the actual recommender
function tag_matches(gameId) {
  var importantTags = globalGameData.get(gameId).tags // TODO, what is the rule here?
  var games = []
  for (var [game, data] of globalGameData.entries()) {
    if (game == gameId) continue // Don't recommend the current game
    if (data.tags.intersection(importantTags).length > 0) games.push(game)
  }

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

function sort_games_by_tags(games, gameId) {
  var tagWeights = new Array(globalTagData.length).fill(0)
  for (var tag of globalGameData.get(gameId).tags) {
    tagWeights[tag] = globalTagData[tag].weight
  }

  var gameWeights = new Map()
  for (var game of games) {
    total = 0
    weight = 0
    for (var tag of globalGameData.get(game).tags) {
      weight += tagWeights[tag]
      total += globalTagData[tag].weight
    }
    gameWeights.set(game, total == 0 ? 0 : weight / total)
  }

  // Inverse sort so that the largest numbers (highest matches) are topmost
  games.sort((a, b) => Math.sign(gameWeights.get(b) - gameWeights.get(a)))
  return games
}
