window.onload = function() {
  // For local development, run chrome with --allow-file-access-from-files
  // I might be able to work around that at some point by using actual JS files.

  Promise.all([load_game_data(), load_tag_data()])
  .then(r => loadAboutGame(210970))
  .then(r => loadImages(210970))
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
  } else if (key == 'style') {
    elem.style = value
  } else {
    elem.setAttribute(key, value)
  }
}

var styles = {
  'Hidden gem':    'background: deepskyblue; color: white; font-weight: bold; font-size: 20px',
  'Similar tags':  'background: darkgreen; color: white; font-weight: bold; font-size: 20px',
  'Reverse match': 'background: darkmagenta; color: white; font-weight: bold; font-size: 20px',
  'Loose match':   'background: sienna; color: white; font-weight: bold; font-size: 20px',
  'Default match': 'background: darkred; color: white; font-weight: bold; font-size: 20px',
  'Selected':      'background: white; color: black; font-weight: bold; font-size: 20px',
}

function setImageCard(loc, data) {
  var [gameId, recommender, note] = data
  set(loc + '-cell', 'style', styles[recommender])
  set(loc + '-cell', 'hover', () => {
    // TODO: Tooltip here? Tooltip elsewhere?
    loadAboutGame(gameId)
  })
  set(loc + '-title', 'innerText', recommender)
  set(loc + '-title', 'href', 'https://store.steampowered.com/app/' + gameId) // wait what?
  if (note != null) set(loc + '-note', 'innerText', note)
  set(loc + '-image', 'src', 'https://cdn.akamai.steamstatic.com/steam/apps/' + gameId + '/header.jpg')
}

var pageNo = 0
function loadImages(gameId) {
  /* this goes somewhere else, not sure. I need an onclick event anyways
  set('less', 'onpointerdown', () => {
    pageNo = (pageNo > 0 ? pageNo - 1 : 0)
    loadImages(gameId)
  })
  set('more', 'onpointerdown', () => {
    pageNo++
    loadImages(gameId)
  })
  */

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
      for (var i = 0; i < Math.min(9 - matches.length, per_category); i++) {
        if (gems.length == 0) break
        matches.push([gems.shift(), 'Hidden gem', '0%']) // TODO: I guess I need to cache the game:tag list, mmk
      }
    }
    if (r_tags) {
      for (var i = 0; i < Math.min(9 - matches.length, per_category); i++) {
        if (tags.length == 0) break
        matches.push([tags.shift(), 'Similar tags', '0%']) // TODO: I guess I need to cache the game:tag list, mmk
      }
    }
    if (r_loose) {
      for (var i = 0; i < Math.min(9 - matches.length, per_category); i++) {
        if (loose.length == 0) break
        matches.push([loose.shift(), 'Loose match'])
      }
    }
    if (r_reverse) {
      for (var i = 0; i < Math.min(9 - matches.length, per_category); i++) {
        if (reverse.length == 0) break
        matches.push([reverse.shift(), 'Reverse match'])
      }
    }
    for (var i = 0; i < Math.min(9 - matches.length, per_category); i++) {
      if (similar.length == 0) break
      matches.push([similar.shift(), 'Default match'])
    }
  }

  setImageCard('mm', [gameId, 'Selected'])
  setImageCard('tl', matches[0])
  setImageCard('tm', matches[1])
  setImageCard('tr', matches[2])
  setImageCard('mr', matches[3])
  setImageCard('br', matches[4])
  setImageCard('bm', matches[5])
  setImageCard('bl', matches[6])
  setImageCard('ml', matches[7])
}

function toggleRecommender() {
  if (this.className === 'toggle') {
    this.className = 'toggle-off'
  } else {
    this.className = 'toggle'
  }
}

function loadAboutGame(gameId) {
  set('game-title', 'innerText', globalGameData.get(gameId).name)

  set('open-web', 'href', `https://store.steampowered.com/app/${gameId}?utm_campaign=divingbell`)
  set('open-app', 'href', `steam://store/${gameId}`)

  /*
  fetch(`bin/html5/bin/data/v2/app_details/${gameId}.txt`)
  .then(r => r.json())
  .then(r => r[gameId].data)
  .then(r => {
    set('short-description', 'innerText', r.short_description)
    set('price', 'innerText', r.price_overview.final_formatted)
    set('genres', 'innerText', r.genres.map(g => g.description).join(', '))
    var platforms = []
    if (r.platforms.windows) platforms.push('Windows')
    if (r.platforms.mac)     platforms.push('Mac')
    if (r.platforms.linux)   platforms.push('Linux')
    set('platforms', 'innerText', platforms.join(', '))
    set('categories', 'innerText', r.categories.map(c => c.description).join(', '))
    set('video', 'src', r.movies[0].webm.max)
    set('photo-1', 'src', r.screenshots[0].path_full)
    set('photo-2', 'src', r.screenshots[1].path_full)
    set('photo-3', 'src', r.screenshots[2].path_full)
  })
  */

  var tagNames = Array.from(globalGameData.get(gameId).tags).map(tag => globalTagData[tag].name)
  set('tags', 'innerText', tagNames.join(', '))

  var perc = globalGameData.get(gameId).perc
  var total = globalGameData.get(gameId).total

  // Rating names according to https://reddit.com/r/Steam/comments/ivz45n/
  var ratingNames = []
  if (total < 50)       ratingNames = [[0.80, 'Positive'],      [0.70, 'Mostly Positive'], [0.40, 'Mixed'], [0.20, 'Mostly Negative'], [0.00, 'Negative']]
  else if (total < 500) ratingNames = [[0.80, 'Very Positive'], [0.70, 'Mostly Positive'], [0.40, 'Mixed'], [0.20, 'Mostly Negative'], [0.00, 'Very Negative']]
  else                  ratingNames = [[0.95, 'Overwhelmingly Positive'], [0.80, 'Very Positive'], [0.70, 'Mostly Positive'], [0.40, 'Mixed'], [0.20, 'Mostly Negative'], [0.00, 'Overwhelmingly Negative']]
  var ratingName = ratingNames.find(x => x[0] < perc)[1]
  set('rating', 'innerText', `${ratingName} (${Math.trunc(100 * perc)}% — ${total} ratings)`)
}
