import difference from 'lodash/array/difference';
import groupBy from 'lodash/collection/groupBy';
import mapValues from 'lodash/object/mapValues';
import pairs from 'lodash/object/pairs';

import jsmediatags from 'jsmediatags';
import XhrFileReader from 'jsmediatags/build2/XhrFileReader';

import * as sourceUtils from '../utils/sources';
import { makeTrackObject } from '../reducers/tracks';


self.addEventListener('message', (event) => {
  process(event.data).then((diff) => {
    // = done
    self.postMessage({
      isDone: true,
      progress: 1.0,
      diff,
    });
  });
});


/// jsmediatags
///
function meta(urlGET, urlHEAD) {
  const fakeURL = 'STOP_ME_FROM_DOING_EVIL';

  const reader = new jsmediatags.Reader(fakeURL);
  const fileReader = new XhrFileReader(fakeURL);
  const makeXHRRequest = fileReader._makeXHRRequest;

  fileReader._createXHRObject = function() {
    return new XMLHttpRequest();
  };

  fileReader._makeXHRRequest = function(method, ...args) {
    this._url = method.toUpperCase() === 'HEAD' ? urlHEAD : urlGET;
    return makeXHRRequest.call(this, method, ...args);
  };

  return new Promise((resolve, reject) => {
    fileReader.init({
      onSuccess: () => {

        reader._getTagReader(fileReader, {
          onSuccess: (TagReader) => {
            new TagReader(fileReader)
              .setTagsToRead(reader._tagsToRead)
              .read({ onSuccess: resolve, onError: reject });
          },
          onError: reject
        });

      },
      onError: reject,
    });
  });
}


/// Utils
///
function process(args) {
  const externalTreesPromise = getExternalTrees(args.sources);
  const internalTrees = getInternalTrees(args.tracks);

  return externalTreesPromise.then(
    (externalTrees) => {
      return compareTrees({
        external: externalTrees,
        internal: internalTrees,
      });
    }
  ).then(
    (diff) => {
      return getAttributesForNewTracks(
        Object.assign({}, args, { diff })
      );
    }
  );
}


/**
 * Get trees from external sources.
 *
 * @struct tree
 * [ path, path, ... ]
 *
 * @return {Promise}
 * { `${source-id}` : tree }
 */
function getExternalTrees(sources) {
  const promises = sources.map((source) => {
    return sourceUtils.getTree(source).then(
      (tree) => {
        return { sourceUid: source.uid, tree };
      }
    );
  });

  return Promise.all(promises).then(
    (treesWithSource) => {
      const treesGroupedBySourceUid = {};

      treesWithSource.forEach((t) => {
        treesGroupedBySourceUid[t.sourceUid] = t.tree;
      });

      return treesGroupedBySourceUid;
    }
  );
}


/**
 * Get paths from stored tracks to make internal trees.
 *
  * @struct tree
  * [ path, path, ... ]
  *
  * @return {Promise}
  * { `${source-id}` : tree }
 */
function getInternalTrees(tracks) {
  const tracksGroupedBySourceUid = groupBy(tracks, 'sourceUid');
  const trees = {};

  Object.keys(tracksGroupedBySourceUid).forEach((sourceUid) => {
    trees[sourceUid] = tracksGroupedBySourceUid[sourceUid].map((track) => track.path);
  });

  return trees;
}


/**
 * Compare external and internal trees.
 * Returns a diff.
 *
 * @return
 * { `${source-id}` : { missing: [path], new: [path] }}
 */
function compareTrees(args) {
  const { external, internal } = args;
  const diff = {};

  Object.keys(external).forEach((sourceUid) => {
    const sourceOfTruth = external[sourceUid];
    const internalItems = internal[sourceUid] || [];

    const newItems = difference(sourceOfTruth, internalItems);
    const missingItems = difference(internalItems, sourceOfTruth);

    if (newItems.length || missingItems.length) {
      diff[sourceUid] = { 'new': newItems, 'missing': missingItems };
    }
  });

  return diff;
}


/**
 * Get the metadata from the (new) remote audio files.
 */
function getAttributesForNewTracks(args) {
  const diffPaired = pairs(args.diff);
  const sourcesGroupedById = groupBy(args.sources, 'uid');
  const results = mapValues(args.diff, (d) => {
    return { new: [], missing: d.missing };
  });

  let totalNewItems = 0;

  diffPaired.forEach((pair) => {
    totalNewItems = totalNewItems + pair[1].new.length;
  });

  return getAttributesForNewTrackLoop(
    diffPaired,
    sourcesGroupedById,
    0,
    0,
    results,
    totalNewItems,
    0

  ).then((newAttributes) => {
    return Object.assign({}, args.diff, newAttributes);

  });
}


function getAttributesForNewTrackLoop(
  diffs, sources, sourceIdx, itemIdx,
  results, totalNew, totalItemIdx
) {
  const diff = diffs[sourceIdx];
  const newItems = diff ? diff[1].new : [];
  const newItem = newItems[itemIdx];
  const source = diff ? sources[diff[0]][0] : null;

  if (!newItem || !source) {
    return Promise.resolve(results);
  }

  return getAttributesForNewTrack(source, newItem).then((tags) => {
    if (tags) {
      results[source.uid].new.push(tags);
    }

    let nextItemIdx = itemIdx + 1;
    let nextSourceIdx = sourceIdx;

    if (!newItems[nextItemIdx]) {
      nextItemIdx = 0;
      nextSourceIdx = sourceIdx + 1;
    }

    if (!diffs[nextSourceIdx]) {
      // = done
      return results;
    }

    self.postMessage({
      isDone: false,
      progress: ((totalItemIdx + 1) / totalNew),
    });

    return getAttributesForNewTrackLoop(
      diffs,
      sources,
      nextSourceIdx,
      nextItemIdx,
      results,
      totalNew,
      totalItemIdx + 1
    );
  });
}


function getAttributesForNewTrack(source, newItem) {
  const urlGET = sourceUtils.getSignedUrl(source, newItem, 'GET', 10);
  const urlHEAD = sourceUtils.getSignedUrl(source, newItem, 'HEAD', 10);

  return meta(urlGET, urlHEAD).then(

    ({ tags }) => {
      const {
        album,
        artist,
        genre,
        title,
        track,
        year,
      } = tags;

      return makeTrackObject({
        path: newItem,
        sourceUid: source.uid,

        properties: {
          album: album ? album.toString() : undefined,
          artist: artist ? artist.toString() : undefined,
          genre: genre ? genre.toString() : undefined,
          title: title ? title.toString() : undefined,
          year: year ? year.toString() : undefined,

          track: track,
        },
      });
    },

    () => {
      return null;
    }

  );
}
