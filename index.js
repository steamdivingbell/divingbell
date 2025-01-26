window.onload = function() {
  // For local development, run chrome with --allow-file-access-from-files
  // I might be able to work around that at some point by using actual JS files.
  // Outstanding ideas from Mr. diving bell:
  // - Require games to include tag 'X'
  // - Require games to exclude tag 'Y'
  // - Make it easier to pick a starting game
  // All of the above require a 'search' feature. Le sigh.

  window.loadDataFiles()
  var params = new URLSearchParams(window.location.search)
  if (params.has('appid')) {
    setActiveGame(params.get('appid'))
  } else {
    // Order games by adjusted rating
    var games = Array.from(window.globalGameData.keys())
    games.sort((a, b) => Math.sign(globalRatingData.get(b).sortKey - globalRatingData.get(a).sortKey))
    
    // Then pick one of the top 100 (randomly) -- these should be games that people should be familiar with (I hope).
    var index = Math.floor(Math.random() * 100)
    setActiveGame(games[index])
  }
}

function set(id, key, value) {
  var elem = document.getElementById(id)
  if (key == 'innerText') {
    elem.innerText = value
  } else if (key == 'hover') {
    elem.onmouseenter = () => {
      var timer = setTimeout(value, 1000)
      elem.onmouseleave = () => { clearTimeout(timer) }
    }
  } else if (key == 'click') {
    elem.onpointerdown = value
  } else if (key == 'style') {
    elem.style = value
  } else if (key == 'display') {
    elem.style.display = value
  } else {
    elem.setAttribute(key, value)
  }
}

var previousGames = [] // Keep track of previous games so that we can use the 'back' button to go back.
function setActiveGame(gameId) {
  loadAboutGame(gameId)
  pageNo = 0 // Reset back to the first page of results
  loadImages(gameId)
  setupButtons(gameId)
}

var styles = {
  'Selected':       'background: white;       color: black; font-weight: bold; font-size: 20px',
  'Hidden gem':     'background: deepskyblue; color: white; font-weight: bold; font-size: 20px',
  'Similar tags':   'background: darkgreen;   color: white; font-weight: bold; font-size: 20px',
  'Loose match':    'background: sienna;      color: white; font-weight: bold; font-size: 20px',
  'Reverse match':  'background: darkmagenta; color: white; font-weight: bold; font-size: 20px',
  'Default match':  'background: darkred;     color: white; font-weight: bold; font-size: 20px',
}

function setImageCard(loc, data) {
  var [gameId, recommender, baseGameId] = data
  set(loc + '-cell', 'hover', () => loadAboutGame(gameId))
  set(loc + '-cell', 'click', () => { previousGames.push(baseGameId); setActiveGame(gameId) })
  set(loc + '-cell', 'style', styles[recommender])
  set(loc + '-title', 'innerText', recommender)
  set(loc + '-title', 'href', 'https://store.steampowered.com/app/' + gameId)
  set(loc + '-image', 'src', 'https://cdn.akamai.steamstatic.com/steam/apps/' + gameId + '/header.jpg')
  
  if (gameId == null) return // Ran out of recommendations

  var gameName = globalGameData.get(gameId).name
  var baseGameName = globalGameData.get(baseGameId).name

  var titleText = {
    'Selected': ``,
    'Hidden gem': `Hidden gem
${gameName} is a highly-rated but little-known game with several tags in common with ${baseGameName}:
${compare_candidates_verbose(baseGameId, gameId)}`,
    'Similar tags': `Similar tags
${gameName} has several tags in common with ${baseGameName}:
${compare_candidates_verbose(baseGameId, gameId)}`,
    'Loose match': `Loose match
${gameName} is a loose "more like this" match for ${baseGameName}.
It is commonly recommended by games which are recommended by ${baseGameName}.`,
    'Reverse match': `Reverse match
${gameName} is a reverse "more like this" match for ${baseGameName},
i.e. ${baseGameName} is recommended by ${gameName}.`,
    'Default match': `Default match
${gameName} is a "default" match, since it is directly recommended by ${baseGameName}.`,
  }[recommender]
  set(loc + '-image', 'title', titleText)

  if (recommender == 'Hidden gem' || recommender == 'Similar tags') {
    var perc = Math.round(100 * compare_candidates(baseGameId, gameId)) + '%'
    set(loc + '-note', 'innerText', perc)
  } else {
    set(loc + '-note', 'innerText', null)
  }
}

var pageNo = 0 // Global, used for 'back' and 'more' buttons
function loadImages(baseGameId) {
  var r_gems = document.getElementById('r_gems').className == 'toggle'
  var r_tags = document.getElementById('r_tags').className == 'toggle'
  var r_loose = document.getElementById('r_loose').className == 'toggle'
  var r_reverse = document.getElementById('r_reverse').className == 'toggle'

  var num_enabled = (r_gems ? 1 : 0) + (r_tags ? 1 : 0) + (r_loose ? 1 : 0) + (r_reverse ? 1 : 0)
  var per_category = [12, 8, 4, 3, 2][num_enabled]

  var gems = gem_matches(baseGameId)
  var tags = tag_matches(baseGameId)
  var loose = loose_matches(baseGameId)
  var reverse = reverse_matches(baseGameId)
  var similar = default_matches(baseGameId)

  var shownGames = new Set()
  for (var page = 0; page <= pageNo; page++) {
    var matches = []
    if (r_gems) {
      for (var i = 0; i < per_category; i++) {
        if (matches.length == 8) break
        if (gems.length == 0) break
        var gameId = gems.shift()
        if (shownGames.has(gameId)) i--
        else {
          matches.push([gameId, 'Hidden gem', baseGameId])
          shownGames.add(gameId)
        }
      }
    }
    if (r_tags) {
      for (var i = 0; i < per_category; i++) {
        if (matches.length == 8) break
        if (tags.length == 0) break
        var gameId = tags.shift()
        if (shownGames.has(gameId)) i--
        else {
          matches.push([gameId, 'Similar tags', baseGameId])
          shownGames.add(gameId)
        }
      }
    }
    if (r_loose) {
      for (var i = 0; i < per_category; i++) {
        if (matches.length == 8) break
        if (loose.length == 0) break
        var gameId = loose.shift()
        if (shownGames.has(gameId)) i--
        else {
          matches.push([gameId, 'Loose match', baseGameId])
          shownGames.add(gameId)
        }
      }
    }
    if (r_reverse) {
      for (var i = 0; i < per_category; i++) {
        if (matches.length == 8) break
        if (reverse.length == 0) break
        var gameId = reverse.shift()
        if (shownGames.has(gameId)) i--
        else {
          matches.push([gameId, 'Reverse match', baseGameId])
          shownGames.add(gameId)
        }
      }
    }
    // Fallback to Steam's recommendations if we run out of our recommenders
    for (var i = 0; /**/; i++) {
      if (matches.length == 8) break
      if (similar.length == 0) break
      var gameId = similar.shift()
      if (shownGames.has(gameId)) i--
      else {
        matches.push([gameId, 'Default match', baseGameId])
        shownGames.add(gameId)
      }
    }
    // Placeholder if we run out of everything so we don't crash
    while (matches.length < 8) matches.push([null, null, baseGameId])
  }

  setImageCard('mm', [baseGameId, 'Selected', baseGameId])
  setImageCard('tl', matches[0])
  setImageCard('tm', matches[1])
  setImageCard('tr', matches[2])
  setImageCard('mr', matches[3])
  setImageCard('br', matches[4])
  setImageCard('bm', matches[5])
  setImageCard('bl', matches[6])
  setImageCard('ml', matches[7])

  // Setup alt text for the various dynamic buttons
  set('r_gems', 'title', (r_gems ? 'Disable' : 'Enable') + ' the "Gems" recommender')
  set('r_tags', 'title', (r_tags ? 'Disable' : 'Enable') + ' the "Tags" recommender')
  set('r_loose', 'title', (r_loose ? 'Disable' : 'Enable') + ' the "Loose" recommender')
  set('r_reverse', 'title', (r_reverse ? 'Disable' : 'Enable') + ' the "Reverse" recommender')

  if (pageNo > 0) { // If there are still previous pages
    set('back', 'title', `Previous results for ${globalGameData.get(baseGameId).name}`)
    set('back', 'class', 'navigation')
  } else if (previousGames.length > 0) { // Otherwise, this button goes back to the previous game
    var previousGame = previousGames[previousGames.length - 1]
    set('back', 'title', `Back to results for ${globalGameData.get(previousGame).name}`)
    set('back', 'class', 'navigation')
  } else {
    set('back', 'title', '')
    set('back', 'class', 'navigation-disabled')
  }

  set('more', 'title', `More results for ${globalGameData.get(baseGameId).name}`)
}

function setupButtons(gameId) {
  var toggleRecommender = function() {
    if (this.className === 'toggle') {
      this.className = 'toggle-off'
    } else {
      this.className = 'toggle'
    }

    loadImages(gameId)
  }

  set('r_gems', 'click', toggleRecommender)
  set('r_tags', 'click', toggleRecommender)
  set('r_loose', 'click', toggleRecommender)
  set('r_reverse', 'click', toggleRecommender)

  set('back', 'click', () => {
    if (pageNo > 0) { // If there are previous pages of results, go to them
      pageNo--
      loadImages(gameId)
    } else if (previousGames.length > 0) { // Otherwise, go back to the previous game
      setActiveGame(previousGames.pop())
    }
  })
  set('more', 'click', () => {
    pageNo++
    loadImages(gameId)
  })
}

function loadAboutGame(gameId) {
  // If this game is already loaded, don't reload it (it causes a flicker and restarts the video)
  if (document.getElementById('open-app').href == `steam://store/${gameId}`) return

  set('game-title', 'innerText', globalGameData.get(gameId).name)

  set('open-web', 'href', `https://store.steampowered.com/app/${gameId}?utm_campaign=steamdivingbell`)
  set('open-app', 'href', `steam://store/${gameId}`)

  loadGameDetails(gameId)
  .then(r => {
    set('short-description', 'innerText', r.description)
    set('genres', 'innerText', r.genres.join(', '))
    set('price', 'innerText', r.price)
    set('platforms', 'innerText', r.platforms.join(', '))
    set('categories', 'innerText', r.categories.join(', '))
    set('tags', 'innerText', r.tags.join(', '))
    set('rating', 'innerText', globalRatingData.get(gameId).ratingText)

    if (r.video != null) {
      set('video', 'display', null)
      set('video', 'src', r.video)
      set('photo-1', 'src', r.photos[0])
      set('photo-2', 'src', r.photos[1])
      set('photo-3', 'src', r.photos[2])
      set('photo-4', 'display', 'none')
      set('photo-4', 'src', '')
    } else {
      set('video', 'src', '')
      set('video', 'display', 'none')
      set('photo-1', 'src', r.photos[0])
      set('photo-2', 'src', r.photos[1])
      set('photo-3', 'src', r.photos[2])
      set('photo-4', 'src', r.photos[3])
      set('photo-4', 'display', null)
    }
  })
}
