window.onload = function() {
  // For local development, run chrome with --allow-file-access-from-files
  // I might be able to work around that at some point by using actual JS files.

  set('r_gems',    'onpointerdown', toggleRecommender)
  set('r_tags',    'onpointerdown', toggleRecommender)
  set('r_loose',   'onpointerdown', toggleRecommender)
  set('r_reverse', 'onpointerdown', toggleRecommender)

  Promise.all([load_game_data(), load_tag_data()])
  .then(r => loadAboutGame(210970))
  .then(r => loadImages(210970))
}

function set(id, key, value) {
  var elem = document.getElementById(id)
  if (key == 'innerText') {
    elem.innerText = value
  } else if (key == 'onpointerdown') {
    elem.addEventListener('onpointerdown', value)
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
  'Hidden Gem':    'background: deepskyblue; color: white; font-weight: bold; font-size: 20px',
  'Similar tags':  'background: darkgreen; color: white; font-weight: bold; font-size: 20px',
  'Reverse match': 'background: darkmagenta; color: white; font-weight: bold; font-size: 20px',
  'Loose match':   'background: sienna; color: white; font-weight: bold; font-size: 20px',
  'Selected':      'background: white; color: black; font-weight: bold; font-size: 20px',
}

function setImageCard(loc, gameId, recommender, note) {
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

function loadImages(gameId) {
  setImageCard('mm', gameId, 'Selected')

  setImageCard('tl', '670750', 'Hidden Gem', '62%')
  setImageCard('tm', '243220', 'Hidden Gem', '62%')

  var matches = tag_matches(gameId)

  setImageCard('tr', '512790', 'Similar tags', '80%')
  setImageCard('mr', '258520', 'Similar tags', '65%')

  setImageCard('br', '624270', 'Loose match')
  setImageCard('bm', '251110', 'Loose match')

  var matches = reverse_matches(gameId)
  matches = sort_games_by_tags(Array.from(matches), gameId)
  setImageCard('bl', '383870', 'Reverse match')
  setImageCard('ml', '866440', 'Reverse match')
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
