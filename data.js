var globalGameData = new Map()
function load_game_data() {
  for (var gameId in window.game_names) {
    globalGameData.set(gameId, {
      'name': window.game_names[gameId],
      'tags': new Set(),
      'similar': new Set(),
      'reverse': new Set(),
    })
  }
  
  for (var gameId in window.similar_games) {
    for (var similarGame of window.game_names[gameId]) {
      if (!globalGameData.has(similarGame)) continue // TODO: Data sanity? I don't think this should be possible.

      globalGameData.get(gameId).similar.add(similarGame)
      globalGameData.get(similarGame).reverse.add(gameId)
    }
  }

  // TODO: Tags...? Uh oh.
  /*
  .then(r => fetch('data/tags.json'))
  .then(r => r.text())
  .then(r => {
    for (var line of r.split('\n')) {
      var [gameId, tags] = line.split('\t')
      if (tags == '') continue
      if (!globalGameData.has(gameId)) continue
      for (var tag of tags.split(',')) {
        globalGameData.get(gameId).tags.add(parseInt(tag))
      }
    }
  })
  */
}

var globalRatingData = new Map()
function load_rating_data() {
  for (var gameId in window.reviews) {
    if (!globalGameData.has(gameId)) continue // TODO: Data sanity? I don't think this should be possible.

    var data = window.reviews[gameId]

    // Secondary rating which is more fair for sparsely-rated games
    // See https://steamdb.info/blog/steamdb-rating
    var total = data.total_reviews
    var perc = data.total_positive / total
    var gemRating = perc - (perc - 0.5) * Math.pow(2, -Math.log10(total + 1));

    globalRatingData.set(gameId, {
      'total': data.total_reviews,
      'positive': data.total_positive, // TODO: Unused
      'perc': perc,
      'gemRating': gemRating,
      'ratingName': data.review_score_desc,
      'isLowRated': perc < 0.80 || total < 500,
    })
  }
}

var categoryWeights = {'subgenre': 4, 'viewpoint': 3, 'theme': 2, 'players': 2, 'feature': 2, 'time': 2, 'story': 2, 'genre': 2}
var globalTagData = new Map()
function load_tag_data() {
  for (var tag in window.tags) {
    var categories = window.tags[tag].categories || []

    // Tags are associated with their heaviest category
    var bestCategory = null
    var bestWeight = 0
    for (var category of categories) {
      var categoryWeight = categoryWeights[category] || 1
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
}

function loadGameDetails(gameId) {
  return fetch(`data/app_details/${gameId}.json`)
  .then(r => r.json())
  .then(r => {
    var gameDetails = {
      'description': r.short_description,
      'genres': r.genres.map(g => g.description),
      'price': 'Unknown',
      'platforms': [],
      'categories': r.categories.map(c => c.description),
      'tags': Array.from(globalGameData.get(gameId).tags).map(tag => globalTagData[tag].name),
      'photos': r.screenshots.map(s => s.path_full),
    }

    if (r.is_free) gameDetails.price = 'Free'
    else if (r.price_overview != null) gameDetails.price = r.price_overview.final_formatted

    if (r.platforms.windows) gameDetails.platforms.push('Windows')
    if (r.platforms.mac)     gameDetails.platforms.push('Mac')
    if (r.platforms.linux)   gameDetails.platforms.push('Linux')

    if (r.movies != null && r.movies.length > 0) gameDetails['video'] = r.movies[0].webm.max

    return gameDetails
  })
}