"""
This python script downloads all of the data we need to run steam diving bell.
Some of it comes from documented web APIs, some from undocumented APIs, and a small amount of data is from raw HTML scraping.
All of this is automated to allow the diving bell code to be automatically updated as new games come out, and game reviews/tags change.
"""
from datetime import datetime, timedelta
from time import sleep
import json
import random
import requests

headers = {
  'User-Agent': 'SteamDivingBell/3.0 (https://github.com/jbzdarkid/divingbell; https://github.com/jbzdarkid/divingbell/issues)',
}

## Helper methods ##

def load_json(file):
  with open(file, 'r', encoding='utf-8') as f:
    return json.load(f)

def dump_json(data, file):
  with open(file, 'w', encoding='utf-8') as f:
    json.dump(data, f, sort_keys=True, separators=(',', ':'))

def get(url):
  r = requests.get(url, timeout=20, headers=headers)
  r.raise_for_status()
  return r.json()

def between(string, before, after):
  start = string.index(before) + len(before)
  end = string.index(after, start)
  return string[start:end]

## Official APIs ##

def download_app_list():
  """https://steamapi.xpaw.me/#ISteamApps/GetAppList"""
  latest_games = {}
  app_list = get('https://api.steampowered.com/ISteamApps/GetAppList/v2')['applist']['apps']
  for game_data in app_list:
    latest_games[str(game_data['appid'])] = game_data['name']

  game_names = load_json('game_names.json')
  print('Removed games: ', sorted(set(game_names.keys()) - set(latest_games.keys())))
  print('Added games: ', sorted(set(latest_games.keys()) - set(game_names.keys())))
  game_names |= latest_games # Dict update operator from python 3.9
  dump_json(game_names, 'game_names.json')

## Unofficial APIs ##

def download_tags():
  """https://github.com/Revadike/InternalSteamWebAPI/wiki/Get-Categories-By-Tag"""
  tag_data = get('https://steamcommunity.com/sale/ajaxgetcategoriesbytag')

  latest_tags = {}
  for tag_id, name in tag_data['rgTagNames'].items():
    latest_tags[tag_id] = {'id': tag_id, 'name': name}
  for tag_id, categories in tag_data['rgCategoriesByTag'].items():
    latest_tags[tag_id]['categories'] = categories

  tags = load_json('tags.json')
  print('Removed tags: ', sorted(set(tags.keys()) - set(latest_tags.keys())))
  print('Added tags: ', sorted(set(latest_tags.keys()) - set(tags.keys())))
  tags |= latest_tags # Dict update operator from python 3.9
  dump_json(tags, 'tags.json')

def download_app_details(game_id):
  """https://github.com/Revadike/InternalSteamWebAPI/wiki/Get-App-Details"""
  app_details = get(f'https://store.steampowered.com/api/appdetails?appids={game_id}')[game_id]['data']
  dump_json(app_details, f'app_details/{game_id}.json')

def download_review_details(game_id):
  """https://github.com/Revadike/InternalSteamWebAPI/wiki/Get-App-Reviews"""
  app_reviews = get(f'https://store.steampowered.com/appreviews/{game_id}?json=1&filter=summary&language=all&purchase_type=all')

  reviews = load_json('reviews.json')
  reviews[game_id] = app_reviews['query_summary']
  dump_json(reviews, 'reviews.json')

## HTML scraping ##

def download_similar_games(game_id):
  r = requests.get(f'https://store.steampowered.com/recommended/morelike/app/{game_id}', timeout=20, headers=headers)
  basic_recommendations = between(r.text, '<h1 class="morelike_section_divider">Default</h1>', '<h2 class="morelike_section_divider">Upcoming Releases</h2>')

  # There's more than 9 recommended games in the code, idk use them all
  similar_to_this_game = []
  for line in basic_recommendations.split('\n'):
    if 'data-ds-appid' in line:
      similar_to_this_game.append(between(line, 'data-ds-appid="', '"'))
  
  similar_games = load_json('similar_games.json')
  games_list[game_id]['similar'] = similar_to_this_game
  dump_json(similar_games, 'similar_games.json')

if __name__ == '__main__':
  # Download global data once per hour
  download_app_list()
  download_tags()
  
  # Then, randomly refresh one game every minute
  next_minute = datetime.now() + timedelta(minutes=1)
  game_ids = list(load_json('game_names.json').keys())
  for game_id in random.choices(game_ids, k=60):
    download_app_details(game_id)
    download_similar_games(game_id)
    download_review_details(game_id)
    sleep_seconds = (next_minute - datetime.now()).total_seconds()
    print(f'Sleeping for {sleep_seconds} seconds')
    sleep(sleep_seconds)
    next_minute += timedelta(minutes=1)
