var globalGameData = new Map()
var globalRatingData = new Map()
var globalTagData = new Map()

window.loadDataFiles = function() {
  // We use 'games with reviews' as our master list of valid games.
  for (var gameId in window.reviews) {
    globalGameData.set(gameId, {
      'name': window.game_names[gameId],
      'tags': new Set(window.game_tags[gameId]),
      'similar': new Set(),
      'reverse': new Set(),
    })
  }

  for (var gameId in window.reviews) {
    var data = window.reviews[gameId]

    // Secondary rating which is more fair for sparsely-rated games
    // See https://steamdb.info/blog/steamdb-rating
    var total = data.total_reviews
    var perc = data.total_positive / total
    var gemRating = perc - (perc - 0.5) * Math.pow(2, -Math.log10(total + 1));

    globalRatingData.set(gameId, {
      'ratingText': `${data.review_score_desc} (${Math.trunc(100 * perc)}% — ${total} ratings)`,
      'sortKey': gemRating,
      'isLowRated': perc < 0.80 || total < 500,
      'isHiddenGem': gemRating >= 0.80 && total < 500,
    })
  }

  for (var gameId in window.similar_games) {
    for (var similarGame of window.similar_games[gameId]) {
      if (!globalGameData.has(gameId)) continue // TODO: Hopefully this is not possible once we have full data.
      if (!globalGameData.has(similarGame)) continue // TODO: Hopefully this is not possible once we have full data.

      globalGameData.get(gameId).similar.add(similarGame)
      globalGameData.get(similarGame).reverse.add(gameId)
    }
  }

  // TODO: There might be more things we should weight now.
  var CATEGORY_WEIGHTS = {'subgenre': 4, 'viewpoint': 3, 'theme': 2, 'players': 2, 'feature': 2, 'time': 2, 'story': 2, 'genre': 2}

  for (var tag in window.tags) {
    var categories = window.tags[tag].categories || []

    // Tags are associated with their heaviest category
    var bestCategory = null
    var bestWeight = 0
    for (var category of categories) {
      var categoryWeight = CATEGORY_WEIGHTS[category] || 1
      if (categoryWeight > bestWeight) {
        bestWeight = categoryWeight
        bestCategory = category
      }
    }

    globalTagData.set(tag, {
      'name': window.tags[tag].name,
      'weight': bestWeight,
      'category': bestCategory,
      'isWeak': categories.includes('weak'),
    })
  }

  // Some games are deleted, or part of a bundle, or just not listed on Steam for whatever reason.
  // If we weren't able to load the game's reviews while scraping, it's not publicly listed on steam,
  // and we shouldn't recommend it to users.
  for (var game of Array.from(globalGameData.keys())) {
    if (!globalRatingData.has(game)) globalGameData.delete(game)
  }
}

function loadGameDetails(gameId) {
  return fetch(`data/app_details/${gameId}.json`)
  .then(r => r.json())
  .then(r => {
    var gameDetails = {
      'description': '',
      'price': 'Unknown',
      'tags': [],
      'genres': [],
      'platforms': [],
      'categories': [],
      'screenshots': [],
      'video': null,
    }
    // The description is HTML-escaped, so we need to unescape it.
    var pseudoHtml = '<div>' + r.short_description + '</div>'
    gameDetails.description = new DOMParser().parseFromString(pseudoHtml, 'text/html').documentElement.textContent;

    if (r.genres != null) gameDetails.genres = r.genres.map(g => g.description)
    if (r.categories != null) gameDetails.categories = r.categories.map(c => c.description)
    if (r.screenshots != null) gameDetails.screenshots = r.screenshots.map(s => s.path_full.replace('http://', 'https://'))

    if (window.game_tags[gameId] != null) {
      gameDetails.tags = window.game_tags[gameId].map(tag => globalTagData.get(tag).name)
    }

    if (r.is_free) gameDetails.price = 'Free'
    else if (r.price_overview != null) gameDetails.price = r.price_overview.final_formatted

    if (r.platforms.windows) gameDetails.platforms.push('Windows')
    if (r.platforms.mac)     gameDetails.platforms.push('Mac')
    if (r.platforms.linux)   gameDetails.platforms.push('Linux')

    if (r.movies != null && r.movies.length > 0) gameDetails['video'] = r.movies[0].webm.max.replace('http://', 'https://')

    return gameDetails
  })
}