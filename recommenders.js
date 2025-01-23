// My version of chrome is very old. These should be removed.
Set.prototype.union = Set.prototype.union || function(other) {
  var output = new Set(this)
  for (var elem of other) output.add(elem)
  return output
}

Set.prototype.intersection = Set.prototype.intersection || function(other) {
  var output = new Set()
  for (var elem of other) {
    if (this.has(elem)) output.add(elem)
  }
  return output
}

Set.prototype.difference = Set.prototype.difference || function(other) {
  var output = new Set()
  for (var elem of this) {
    if (!other.has(elem)) output.add(elem)
  }
  return output
}

// "Default", aka more like this: https://store.steampowered.com/recommended/morelike/app/210970
function default_matches(gameId) {
  return Array.from(globalGameData.get(gameId).similar)
}

// "Reverse" is just "more like this" but inverse-lookup, which we have already indexed
function reverse_matches(gameId) {
  var games = []
  for (var game of globalGameData.get(gameId).reverse) {
    if (globalRatingData.get(gameId).isLowRated) continue // Don't recommend poorly-rated games
    games.push(game)
  }
  return sort_games_by_tags(games, gameId)
}

// "Loose" is a 2x 'default' match, excluding the default matches themselves.
function loose_matches(gameId) {
  var siblings = globalGameData.get(gameId).similar
  var games = new Set()

  // Add all second-generation siblings, if they're not immediate siblings and also not us.
  for (var sibling of siblings) {
    for (var grandSibling of globalGameData.get(sibling).similar) {
      if (grandSibling == gameId) continue // Don't recommend ourselves
      if (siblings.has(grandSibling)) continue // Don't recommend immediate siblings
      if (globalRatingData.get(grandSibling).isLowRated) continue // Don't recommend poorly-rated games
      games.add(grandSibling)
    }
  }

  return sort_games_by_tags(Array.from(games), gameId)
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
    if (globalRatingData.get(gameId).isLowRated) continue // Don't recommend poorly-rated games

    // Ensure that this game matches at least one tag in each category
    var missingCategories = new Set(requiredCategories)
    for (var tag of data.tags) {
      if (requiredTags.has(tag)) {
        missingCategories.delete(globalTagData[tag].category)
        if (missingCategories.size === 0) break
      }
    }
    if (missingCategories.size === 0) games.push(game)
  }

  return sort_games_by_tags(games, gameId)
}

// "Hidden gems" is the tags matcher but only for games above some % rating and below some # total ratings. Not sure what those numbers are, yet.
function gem_matches(gameId) {
  var games = []
  for (var [game, data] of globalRatingData.entries()) {
    if (game == gameId) continue // Don't recommend the current game
    // TODO: Should probably filter based on gem score, not raw %. I do need to know what the hell that is though.
    if (data.perc > 0.80 && data.total < 500) games.push(game)
  }

  return sort_games_by_tags(games, gameId)
}

// Used in many places for tie breaks, also used directly for the tag recommender
function sort_games_by_tags(games, gameId) {
  // Inverse sort so that the largest numbers (highest matches) are topmost. Ties broken by % positive rating.
  games.sort((a, b) => Math.sign(compare_candidates(gameId, b) - compare_candidates(gameId, a)) || Math.sign(globalRatingData.get(b).perc - globalRatingData.get(a).perc))
  return games
}

function compare_candidates(gameA, gameB) {
  var tagsA = globalGameData.get(gameA).tags
  var tagsB = globalGameData.get(gameB).tags

  var totalWeight = 0
  for (var tag of tagsA.union(tagsB)) {
    totalWeight += globalTagData[tag].weight
  }

  var matchWeight = 0
  for (var tag of tagsA.intersection(tagsB)) {
    matchWeight += globalTagData[tag].weight
  }

  return matchWeight / totalWeight
}

function compare_candidates_verbose(gameA, gameB) {
  var tagsA = globalGameData.get(gameA).tags
  var tagsB = globalGameData.get(gameB).tags
  var tagData = new Map()

  var totalWeight = 0
  for (var tag of tagsA.union(tagsB)) {
    totalWeight += globalTagData[tag].weight
    var category = globalTagData[tag].category
    if (category != null && !tagData.has(category)) tagData.set(category, {'weight': 0, 'tags': []})
  }

  var matchWeight = 0
  for (var tag of tagsA.intersection(tagsB)) {
    matchWeight += globalTagData[tag].weight
    var category = globalTagData[tag].category
    if (tagData.has(category)) {
      tagData.get(category).weight += globalTagData[tag].weight
      tagData.get(category).tags.push(globalTagData[tag].name)
    }
  }

  // Sort largest categories first, then alphabetical
  var categories = Array.from(tagData.keys())
  categories.sort((a, b) => Math.sign(tagData.get(b).weight - tagData.get(a).weight) || a.localeCompare(b))

  var description = ''
  for (var category of categories) {
    if (tagData.get(category).weight == 0) continue
    tagData.get(category).tags.sort((a, b) => a.localeCompare(b))
    description += `+${tagData.get(category).weight} for ${category}: ${tagData.get(category).tags.join(', ')}\n`
  }

  description += `${matchWeight} points out a possible ${totalWeight}: ${Math.round(100 * matchWeight / totalWeight)}% match\n`

  return description
}