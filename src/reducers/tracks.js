import isObject from 'lodash/lang/isObject';
import sortByAll from 'lodash/collection/sortByAll';

import * as collectionUtils from '../utils/collections';
import * as trackUtils from '../utils/tracks';
import * as types from '../constants/action_types/tracks';


const initialTrack = {
  path: null,
  sourceUid: null,

  properties: {
    album: 'Unknown',
    artist: 'Unknown',
    genre: 'Unknown',
    title: 'Unknown',
    year: 'Unknown',

    track: 1,
  },
};


const initialState = {
  activeCollection: null,
  targetCollection: null,

  filter: (typeof importScripts !== 'function') ?
    (localStorage.getItem('tracksFilter') || '') :
    (''),

  isFetching: false,

  // NOTE:
  // ! FILTERED-ITEMS AND FILTERED-ITEM-IDS
  // ! MUST BE IN THE SAME ORDER
  filteredItems: [],
  filteredItemIds: [],
  items: [],
};


export function makeTrackObject(attributes) {
  return {
    createdAt: Date.now(),
    sourceUid: attributes.sourceUid,
    path: attributes.path,
    properties: { ...initialTrack.properties, ...attributes.properties },
  };
}


export default function tracks(state = initialState, action) {
  let targetCollection;

  switch (action.type) {
  case types.FETCH_TRACKS:
    return {
      ...state,
      isFetching: true,
    };


  case types.FETCH_TRACKS_DONE:
    cleanUpItems(action.items);

    return {
      ...state,
      ...gatherItems(action.items, {
        collection: state.activeCollection,
        filter: state.filter,
      }),
      isFetching: false,
    };


  case types.FILTER_TRACKS:
    localStorage.setItem('tracksFilter', action.value);

    return {
      ...state,
      ...gatherItems(state.items, {
        collection: state.activeCollection,
        filter: action.value,
        filteredOnly: true,
      }),
      filter: action.value,
    };


  case types.REPLACE_TRACKS:
    cleanUpItems(action.items);

    return {
      ...state,
      ...gatherItems(action.items, {
        collection: state.activeCollection,
        filter: state.filter,
      }),
    };


  case types.SET_ACTIVE_COLLECTION:
    targetCollection = state.targetCollection;

    if (action.collection) {
      localStorage.setItem(
        'activeCollection',
        isObject(action.collection) ?
          action.collection.uid :
          action.collection
      );
    } else {
      localStorage.removeItem('activeCollection');
    }

    if (isObject(action.collection) && targetCollection) {
      if (action.collection.uid === targetCollection.uid) {
        targetCollection = null;
        localStorage.removeItem('targetCollection');
      }
    }


    return {
      ...state,
      ...gatherItems(state.items, {
        collection: action.collection,
        filter: state.filter,
      }),
      activeCollection: action.collection,
      targetCollection: targetCollection,
    };


  case types.SET_TARGET_COLLECTION:
    targetCollection = action.collection;

    if (targetCollection) {
      localStorage.setItem('targetCollection', targetCollection.uid);
    } else {
      localStorage.removeItem('targetCollection');
    }

    if (targetCollection && isObject(state.activeCollection)) {
      if (targetCollection.uid === state.activeCollection.uid) {
        targetCollection = null;
        localStorage.removeItem('targetCollection');
      }
    }

    return {
      ...state,
      targetCollection: targetCollection,
    };


  default:
    return state;
  }
}


/// Private
///
function gatherItems(items, options = {}) {
  const collected = getItemsFromCollection(items, options.collection);
  const filtered = runThroughFilter(collected, options.filter);
  const sorted = sortByAll(filtered, [
    (t) => t.properties.artist.toLowerCase(),
    (t) => t.properties.album.toLowerCase(),
    (t) => t.path,
    (t) => t.properties.track,
    (t) => t.properties.title.toLowerCase(),
  ]);

  const result = {
    filteredItems: sorted,
    filteredItemIds: sorted.map(trackUtils.generateTrackId),
  };

  if (!options.filteredOnly) {
    Object.assign(result, { items: [ ...items ] });
  }

  return result;
}


function getItemsFromCollection(items, collection) {
  if (!collection) {
    return items;
  }

  return collectionUtils.matchTracksWithCollection(items, collection);
}


function runThroughFilter(items, filter) {
  if (!filter || !filter.length) {
    return [ ...items ];
  }

  const r = new RegExp(filter.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
  const checkAttr = [ 'title', 'artist', 'album' ];

  return items.filter((item) => {
    let isMatch = false;

    for (let i = 0, j = checkAttr.length; i < j; i++) {
      const m = r.test(item.properties[checkAttr[i]]);
      if (m) { isMatch = true; break; }
    }

    return isMatch;
  });
}


function cleanUpItems(items) {
  items.forEach((item) => {
    if (!item.properties.title) item.properties.title = 'Unknown';
    if (!item.properties.artist) item.properties.artist = 'Unknown';
    if (!item.properties.album) item.properties.album = 'Unknown';
  });
}
