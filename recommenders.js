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

// These were the original 'culledTags', although I might change them at some point.
var REQUIRED_CATEGORY_MATCHES = new Set(['genre', 'theme', 'viewpoint', 'rpg'])

// "Tags" matches games based solely on % of matching steam tags.
// However, we only want to recommend similar games, so we require matching tags in some overall categories.
function tag_matches(gameId) {
  var requiredTags = new Set()
  var requiredCategories = new Set()
  for (var tag of globalGameData.get(gameId).tags) {
    var tagData = globalTagData[tag]
    if (tagData.isWeak) continue
    if (REQUIRED_CATEGORY_MATCHES.has(tagData.category)) {
      requiredTags.add(tag)
      requiredCategories.add(tagData.category)
    }
  }

  var games = []
  for (var [game, data] of globalGameData.entries()) {
    if (game == gameId) continue // Don't recommend the current game
    if (data.perc < 0.80 || data.total < 500) continue // Don't recommend poorly-rated games

    // Ensure that this game matches at least one tag in each category
    var missingCategories = new Set(requiredCategories)
    for (var tag of data.tags) {
      if (requiredTags.has(tag)) {
        missingCategories.delete(globalTagData[tag].category)
        if (missingCategories.length === 0) break
      }
    }
    if (missingCategories.length === 0) games.add(game)
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

// Used in many places for tie breaks, also used directly for the tag recommender
function sort_games_by_tags(games, gameId) {
  // Inverse sort so that the largest numbers (highest matches) are topmost. Ties broken by % positive rating.
  games.sort((a, b) => Math.sign(compare_candidates(gameId, b) - compare_candidates(gameId, a)) || Math.sign(globalGameData.get(b).perc - globalGameData.get(a).perc))
  return games
}

function compare_candidates(gameA, gameB) {
  var tagWeights = new Array(globalTagData.length).fill(0)
  var total = 0
  for (var tag of globalGameData.get(gameA).tags) {
    tagWeights[tag] = globalTagData[tag].weight
    total += globalTagData[tag].weight
  }

  var weight = 0
  for (var tag of globalGameData.get(gameB).tags) {
    weight += tagWeights[tag]
  }

  return weight / total
}

function compare_candidates_verbose(gameA, gameB) {
  var tagWeights = new Array(globalTagData.length).fill(0)
  var total = 0
  for (var tag of globalGameData.get(gameA).tags) {
    tagWeights[tag] = globalTagData[tag].weight
    total += globalTagData[tag].weight
  }

  var tagData = new Map()
  var weight = 0
  for (var tagId of globalGameData.get(gameB).tags) {
    if (tagWeights[tagId] == 0) continue
    var category = globalTagData[tagId].category
    if (!tagData.has(category)) tagData.set(category, {'weight': 0, 'tags': []})
    weight += globalTagData[tagId].weight
    tagData.get(category).weight += globalTagData[tagId].weight
    tagData.get(category).tags.push(globalTagData[tagId].name)
  }
  
  var categories = Array.from(tagData.keys())
  categories.sort((a, b) => Math.sign(tagData.get(b).weight - tagData.get(a).weight) || a.localeCompare(b))

  var description = ''
  for (var category of categories) {
    description += `+${tagData.get(category).weight} for ${category}: ${tagData.get(category).tags.join(', ')}\n`
  }

  description += `${weight} out of ${total}: ${Math.round(100 * weight / total)}% match\n`

  return description
}