/** TODO: Rather than using fetch(), all the data here should just be stored in their converted forms, as js files.
 * We might still use fetch() for files with indvidiual game details, if perf turns out to be an issue (but I doubt it).
**/

var globalGameData = new Map()
function load_game_data() {
  var fileNames = '0_63620, 63630_249630, 249650_292200, 292230_328830, 328880_357900, 357910_386180, 386200_416250, 416260_445380, 445420_465860, 465870_502150, 502200_529360, 529410_557730, 557750_586720, 586740_616720, 616740_652050, 652060_675630, 675640_702150, 702160_729370, 729390_757810, 757820_784150, 784180_810570, 810580_839730, 839810_866080, 866100_892630, 892640_923350, 923360_952710, 952850_984170, 984220_1016710, 1016720_1049820, 1049840_1084920, 1084970_1109080'.split(', ').map(x => `bin/html5/bin/data/v2/more/${x}.tsv`)

  return fetch('bin/html5/bin/data/v2/titles.tsv')
  .then(r => r.text())
  .then(r => {
    for (var line of r.split('\n')) {
      var [gameId, gameName] = line.split('\t')
      gameId = parseInt(gameId)
      globalGameData.set(gameId, {
        'name': gameName,
        'tags': new Set(),
        'similar': new Set(),
        'reverse': new Set(),
        'total': 0,
        'perc': 0.5,
        'gemRating': 0.5,
      })
    }
  })
  .then(r => Promise.all(fileNames.map(f => fetch(f))))
  .then(values => Promise.all(values.map(v => v.text())))
  .then(files => {
    for (var file of files) {
      for (var line of file.split('\n')) {
        if (line == '') continue
        var [gameId, similarGames] = line.split('\t')
        gameId = parseInt(gameId)
        if (!globalGameData.has(gameId)) continue // ??? invalid data
        for (var similarGame of similarGames.split(',')) {
          similarGame = parseInt(similarGame)
          if (!globalGameData.has(similarGame)) continue // ??? invalid data

          globalGameData.get(gameId).similar.add(similarGame)
          globalGameData.get(similarGame).reverse.add(gameId)
        }
      }
    }
  })
  .then(r => fetch('bin/html5/bin/data/v2/tags/all.tsv'))
  .then(r => r.text())
  .then(r => {
    for (var line of r.split('\n')) {
      var [gameId, tags] = line.split('\t')
      if (tags == '') continue
      gameId = parseInt(gameId)
      if (!globalGameData.has(gameId)) continue // ??? invalid data
      for (var tag of tags.split(',')) {
        globalGameData.get(gameId).tags.add(parseInt(tag))
      }
    }
  })
  .then(r => fetch('bin/html5/bin/data/v2/reviews/raw.tsv'))
  .then(r => r.text())
  .then(r => {
    for (var line of r.split('\n')) {
      var [gameId, positive, total] = line.split('\t')
      gameId = parseInt(gameId)
      positive = parseInt(positive)
      total = parseInt(total)
      if (!globalGameData.has(gameId)) continue
      globalGameData.get(gameId).total = total
      globalGameData.get(gameId).perc = positive / (total + 1)
    }
  })
  .then(r => fetch('bin/html5/bin/data/v2/reviews/gem.tsv'))
  .then(r => r.text())
  .then(r => {
    for (var line of r.split('\n')) {
      var [gameId, gemRating] = line.split('\t')
      gameId = parseInt(gameId)
      if (!globalGameData.has(gameId)) continue
      
      // TODO: Probably similar to https://steamdb.info/blog/steamdb-rating/#javascript-implementation but there seems to be some weighting for fewer reviews?
      globalGameData.get(gameId).gemRating = parseInt(gemRating)
    }
  })
}

var globalTagData = []
function load_tag_data() {
  return fetch('bin/html5/bin/data/v2/tags/tags.tsv')
  .then(r => r.text())
  .then(r => {
    for (var line of r.split('\n')) {
      var [tagId, tagName] = line.split('\t')
      globalTagData.push({
        'id': tagId,
        'name': tagName,
        'weight': 1,
        'category': null,
        'isWeak': false,
      })
    }
  })
  .then(r => fetch('bin/html5/bin/data/v2/tags/categories.tsv'))
  .then(r => r.text())
  .then(r => {
    var categoryData = new Map()
    for (var line of r.split('\n')) {
      if (line == '') continue
      var categories = line.split('\t')
      var tagId = categories.shift()
      var modifiers = {'subgenre': 4, 'viewpoint': 3, 'theme': 2, 'players': 2, 'feature': 2, 'time': 2, 'story': 2, 'genre': 2} //, 'weak': 0.5}
      var weight = 1
      for (var category of categories) {
        weight = weight * (modifiers[category] || 1) // default to 1, i.e. no change
        break // "bug"
      }

      categoryData.set(tagId, {'weight': weight, 'category': categories[0]})
    }

    for (var i = 0; i < globalTagData.length; i++) {
      tagId = globalTagData[i].id
      if (!categoryData.has(tagId)) continue
      globalTagData[i].weight = categoryData.get(tagId).weight
      globalTagData[i].category = categoryData.get(tagId).category
    }
    
    return globalTagData
  })
}
