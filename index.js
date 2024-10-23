window.onload = function() {
  // For local development, run chrome with --allow-file-access-from-files
  // I might be able to work around that at some point by using actual JS files.

  Promise.all([load_game_data(), load_tag_data()])
  .then(r => loadAboutGame(210970))
  .then(r => loadImages(210970))
  .then(r => setupButtons(210970))
}

function set(id, key, value) {
  var elem = document.getElementById(id)
  if (key == 'innerText') {
    elem.innerText = value
  } else if (key == 'hover') {
    elem.addEventListener('mouseenter', () => {
      var timer = setTimeout(value, 2000)
      elem.addEventListener('mouseleave', () => { clearTimeout(timer) })
    })
  } else if (key == 'onpointerdown') {
    elem.addEventListener('pointerdown', value)
  } else if (key == 'style') {
    elem.style = value
  } else if (key == 'display') {
    elem.style.display = value
  } else {
    elem.setAttribute(key, value)
  }
}

var styles = {
  'Reverse match': 'background: darkmagenta; color: white; font-weight: bold; font-size: 20px',
  'Loose match':   'background: sienna; color: white; font-weight: bold; font-size: 20px',
  'Default match': 'background: darkred; color: white; font-weight: bold; font-size: 20px',
  'Selected':      'background: white; color: black; font-weight: bold; font-size: 20px',
}

function setImageCard(loc, data) {
  var [gameId, recommender, baseGameId] = data
  set(loc + '-cell', 'hover', () => loadAboutGame(gameId))
  set(loc + '-title', 'innerText', recommender)
  set(loc + '-title', 'href', 'https://store.steampowered.com/app/' + gameId) // wait what?
  set(loc + '-image', 'src', 'https://cdn.akamai.steamstatic.com/steam/apps/' + gameId + '/header.jpg')
  
  // TODO: I wrote this when I was tired. Probably a better way to do it.
  var tagData = new Map()
  for (var tagId of globalGameData.get(gameId).tags) {
    var category = globalTagData[tagId].category
    if (!tagData.has(category)) tagData.set(category, {'weight': 0, 'tags': []})
    tagData.get(category).weight += globalTagData[tagId].weight
    tagData.get(category).tags.push(globalTagData[tagId].name)
  }
  
  var keys = Array.from(tagData.keys())
  keys.sort((a, b) => Math.sign(tagData.get(b).weight - tagData.get(a).weight) || a.localeCompare(b))

  var description = ''
  for (var key of keys) {
    description += `+${tagData.get(key).weight} for ${key}: ${tagData.get(key).tags.join(', ')}\n`
  }

  if (recommender == 'Hidden gem') {
    set(loc + '-cell', 'style', 'background: deepskyblue; color: white; font-weight: bold; font-size: 20px')
    var titleText = 'Hidden gem\n'
    titleText += globalGameData.get(gameId).name + ' is a highly-rated but little-known game'
    // TODO: I guess I need some way to look up the matching tag list, probably just cache it idk
    var perc = '55%'
    set(loc + '-image', 'title', titleText)
    set(loc + '-note', 'innerText', perc)
  } else if (recommender == 'Similar tags') {
    set(loc + '-cell', 'style', 'background: darkgreen; color: white; font-weight: bold; font-size: 20px')
    var titleText = 'Similar tags\n'
    titleText += globalGameData.get(gameId).name + ' has several tags in common with ' + globalGameData.get(baseGameId).name + '\n'
    
    titleText += description



    set(loc + '-image', 'title', titleText)
    set(loc + '-note', 'innerText', perc)
  } else {
    set(loc + '-cell', 'style', styles[recommender])
  }
    
}

var pageNo = 0 // Global, used for 'back' and 'more' buttons
function loadImages(gameId) {
  var r_gems = document.getElementById('r_gems').className == 'toggle'
  var r_tags = document.getElementById('r_tags').className == 'toggle'
  var r_loose = document.getElementById('r_loose').className == 'toggle'
  var r_reverse = document.getElementById('r_reverse').className == 'toggle'

  var num_enabled = (r_gems ? 1 : 0) + (r_tags ? 1 : 0) + (r_loose ? 1 : 0) + (r_reverse ? 1 : 0)
  var per_category = [12, 8, 4, 3, 2][num_enabled]

  var gems = gem_matches(gameId)
  var tags = tag_matches(gameId)
  var loose = loose_matches(gameId)
  var reverse = reverse_matches(gameId)
  var similar = default_matches(gameId)

  for (var i = 0; i <= pageNo; i++) {
    var matches = []
    if (r_gems) {
      for (var i = 0; i < per_category; i++) {
        if (matches.length == 8) break
        if (gems.length == 0) break
        matches.push([gems.shift(), 'Hidden gem', gameId])
      }
    }
    if (r_tags) {
      for (var i = 0; i < per_category; i++) {
        if (matches.length == 8) break
        if (tags.length == 0) break
        matches.push([tags.shift(), 'Similar tags', gameId])
      }
    }
    if (r_loose) {
      for (var i = 0; i < per_category; i++) {
        if (matches.length == 8) break
        if (loose.length == 0) break
        matches.push([loose.shift(), 'Loose match', gameId])
      }
    }
    if (r_reverse) {
      for (var i = 0; i < per_category; i++) {
        if (matches.length == 8) break
        if (reverse.length == 0) break
        matches.push([reverse.shift(), 'Reverse match', gameId])
      }
    }
    for (var i = 0; ; i++) {
      if (matches.length == 8) break
      if (similar.length == 0) break
      matches.push([similar.shift(), 'Default match', gameId])
    }
  }

  setImageCard('mm', [gameId, 'Selected', gameId])
  setImageCard('tl', matches[0])
  setImageCard('tm', matches[1])
  setImageCard('tr', matches[2])
  setImageCard('mr', matches[3])
  setImageCard('br', matches[4])
  setImageCard('bm', matches[5])
  setImageCard('bl', matches[6])
  setImageCard('ml', matches[7])
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

  set('r_gems', 'onpointerdown', toggleRecommender)
  set('r_tags', 'onpointerdown', toggleRecommender)
  set('r_loose', 'onpointerdown', toggleRecommender)
  set('r_reverse', 'onpointerdown', toggleRecommender)
  
  set('back', 'onpointerdown', () => {
    pageNo = (pageNo > 0 ? pageNo - 1 : 0)
    loadImages(gameId)
  })
  set('more', 'onpointerdown', () => {
    pageNo++
    loadImages(gameId)
  })
}

function loadAboutGame(gameId) {
  set('game-title', 'innerText', globalGameData.get(gameId).name)

  set('open-web', 'href', `https://store.steampowered.com/app/${gameId}?utm_campaign=divingbell`)
  set('open-app', 'href', `steam://store/${gameId}`)

  fetch(`bin/html5/bin/data/v2/app_details/${gameId}.txt`)
  .then(r => r.json())
  .then(r => r[gameId].data)
  .then(r => {
    set('short-description', 'innerText', r.short_description)
    set('genres', 'innerText', r.genres.map(g => g.description).join(', '))

    var price = 'Unknown'
    if (r.is_free) price = 'Free'
    else if (r.price_overview != null) price = r.price_overview.final_formatted
    set('price', 'innerText', price)

    var platforms = []
    if (r.platforms.windows) platforms.push('Windows')
    if (r.platforms.mac)     platforms.push('Mac')
    if (r.platforms.linux)   platforms.push('Linux')
    set('platforms', 'innerText', platforms.join(', '))
    set('categories', 'innerText', r.categories.map(c => c.description).join(', '))
    if (r.movies != null) {
      set('video', 'display', null)
      set('video', 'src', r.movies[0].webm.max)
      set('photo-1', 'src', r.screenshots[0].path_full)
      set('photo-2', 'src', r.screenshots[1].path_full)
      set('photo-3', 'src', r.screenshots[2].path_full)
      set('photo-4', 'display', 'none')
      set('photo-4', 'src', '')
    } else {
      set('video', 'src', '')
      set('video', 'display', 'none')
      set('photo-1', 'src', r.screenshots[0].path_full)
      set('photo-2', 'src', r.screenshots[1].path_full)
      set('photo-3', 'src', r.screenshots[2].path_full)
      set('photo-4', 'src', r.screenshots[3].path_full)
      set('photo-4', 'display', null)
    }
  })

  var tagNames = Array.from(globalGameData.get(gameId).tags).map(tag => globalTagData[tag].name)
  set('tags', 'innerText', tagNames.join(', '))

  var perc = globalGameData.get(gameId).perc
  var total = globalGameData.get(gameId).total

  // Rating names according to https://reddit.com/r/Steam/comments/ivz45n/
  var ratingNames = []
  if (total < 50)       ratingNames = [[0.80, 'Positive'],      [0.70, 'Mostly Positive'], [0.40, 'Mixed'], [0.20, 'Mostly Negative'], [0.00, 'Negative']]
  else if (total < 500) ratingNames = [[0.80, 'Very Positive'], [0.70, 'Mostly Positive'], [0.40, 'Mixed'], [0.20, 'Mostly Negative'], [0.00, 'Very Negative']]
  else                  ratingNames = [[0.95, 'Overwhelmingly Positive'], [0.80, 'Very Positive'], [0.70, 'Mostly Positive'], [0.40, 'Mixed'], [0.20, 'Mostly Negative'], [0.00, 'Overwhelmingly Negative']]
  var ratingName = ratingNames.find(x => x[0] <= perc)[1]
  set('rating', 'innerText', `${ratingName} (${Math.trunc(100 * perc)}% — ${total} ratings)`)
}
