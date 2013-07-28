angular.module('ngImg', [])


/**
 * @ngdoc object
 * @name ngImg.$imgPool
 *
 * @description
 * Construct a pool for images, all values are saved as array, multiple times same key `put` is supported.
 *
 *
 * @param {string} poolName Name or id of the newly created image pool.
 *
 * @returns {object} Newly created image pool with the following set of methods:
 *
 * - `{object}` `info()` — Returns id, size, and options of cache.
 * - `{{*}}` `put({string} key, {*} value)` — Puts a new key-value pair into the cache and returns it.
 * - `{{*}}` `get({string} key)` — Returns cached value for `key` or undefined for cache miss. If hit, the cache value will be spliced from the cache.
 * - `{void}` `remove({string} key)` — Removes a key-value pair from the cache.
 * - `{void}` `removeAll()` — Removes all cached values.
 * - `{void}` `destroy()` — Removes references to this cache from $cacheFactory.
 **/
.provider('$imgPool', function () {
  var __provides = {};

  __provides.defaults = {
    flushOnRouteChange: true,
    idPrefix: '$imgPool',
    poolName: 'default'
  };

  __provides.$get = [
           '$cacheFactory', '$rootScope', 
  function ($cacheFactory,   $rootScope) {
    var _createdCacheId = {};

    if (__provides.defaults.flushOnRouteChange) {
      $rootScope.$on('$routeChangeSuccess', function () {
        angular.forEach(_createdCacheId, function (v, cacheId) {
          var cache = $cacheFactory.get(cacheId);
          if (angular.isDefined(cache)) {
            cache.removeAll();
            cache.destroy();
          }
        });
      });
    }

    return function (poolName) {
      var cId = __provides.idPrefix + '.' + (poolName || __provides.defaults.poolName);
          cache = $cacheFactory.get(cId) || $cacheFactory(cId),
          wrap = {};

      _createdCacheId[cId] = true;

      angular.forEach(cache, function (func, name) {
        switch (name) {
          case 'put':
            wrap.put = _wrapPut(cache);
            break;
          case 'get':
            wrap.get = _wrapGet(cache);
            break;
          default:
            wrap[name] = cache[name];
        }
      });

      return wrap;
    };

    function _wrapPut(cache) {
      return function (src, imgElm) {
        var res = cache.get(src);

        if (angular.isDefined(res) && angular.isArray(res)) {
          // modify with reference
          // if imgElm is not presented, clone the first node in the res
          res.push(imgElm || res[0].cloneNode(true));
        }
        else {
          cache.put(src, [imgElm]);
        }
        return imgElm;
      };
    }

    function _wrapGet(cache) {
      return function (src) {
        var res = cache.get(src);

        if (angular.isDefined(res) && angular.isArray(res) && res.length > 0) {
          return res.pop();
        }
      };
    }
  }];

  return __provides;
})

/**
 * @ngdoc object
 * @name ngImg.$loadImg
 *
 * @description
 * Manual loading function of HTML images with easy to use params for directly storing to $imgPool.
 *
 * @param {string | array} src        an src string or an array of srcs
 * @param {function}       callback   callback function triggered after all specified srcs finished loading (either surccess or error) (optional)
 * @param {string}         poolName   if specified, loaded image will be automatically put into the pool named 'poolName' (optional)
 * @param {number}         copies     how many copies of the image should be put into the pool (optional)
 * 
 * @return {HTMLImageElement | array(promise)} 
 *
 * possible usage:
 *   - `$loadImg(src, callback)` 
 *   - `$loadImg(src, callback, poolName)` 
 *   - `$loadImg(src, poolName)` 
 *   - `$loadImg(src, poolName, copies)` 
 */
.provider('$loadImg', function () {
  var __provides = {};

  __provides.defaults = {
    requestLimit: 2
  };

  __provides.$get = [
             '$imgPool', '$q',
    function ($imgPool,   $q) {
      var _prepareQueue = [],
          _requestQuota = __provides.defaults.requestLimit;

      function _dequeue () {
        if (_prepareQueue.length === 0) {
          return;
        }

        if (!_quotaRetrieve()) {
          return;
        }

        var qObj = _prepareQueue.shift(),
            img = qObj[0],
            src = qObj[1],
            callback = qObj[2],
            aImg = angular.element(img),
            onLoad = function () {
              aImg.unbind('load error');
              if (angular.isFunction(callback)) {
                callback(this);
              }
              _quotaRelease();
              _dequeue();
            },
            onError = function () {
              aImg.unbind('load error');
              if (angular.isFunction(callback)) {
                callback(false);
              }
              _quotaRelease();
              _dequeue();
            };

        aImg.bind('load', onLoad);
        aImg.bind('error', onError);

        aImg.prop('src', src);
      }

      function _enqueue(img, src, callback) {
        _prepareQueue.push([img, src, callback]);
      }

      function _quotaRetrieve () {
        if (_requestQuota > 0) {
          _requestQuota--;
          return true;
        }
        return false;
      }

      function _quotaRelease () {
        if (_requestQuota < __provides.defaults.requestLimit) {
          _requestQuota++;
        }
      }

      /**
       * Loads an image and directly put into $imgPool if pool name specified
       * @param  {string}             src      src
       * @param  {function}           callback callback
       * @param  {string}             poolName pool name
       * @param  {number}             copies   number of copies in the pool
       * @return {HTMLImageElement}            the image element
       */
      function _loadImg(src, callback, poolName, copies) {
        // handle args
        switch (arguments.length) {
          case 3: case 2:
            if (angular.isString(callback)) {
              poolName = callback;
              copies = poolName;
            }
        }

        var img = new Image();
        _enqueue(img, src, function (res) {
          if (angular.isString(poolName) && res) {
            var pool = $imgPool(poolName);
            copies = copies || 1;
            while (copies--) {
              pool.put(src, (copies === 0) ? res : res.cloneNode(true));
            }
          }

          if (angular.isFunction(callback)) {
            callback(res);
          }
        });
        _dequeue();
        return img;
      }

      /**
       * Loads a list of images
       * @param  {array}    srcList  src list
       * @param  {function} callback callback(response list) fires on all request finished (either success or error)
       * @param  {string}   poolName pool name
       * @param  {number}   copies   number of copies in the pool
       * @return {array}             array of promises representing each img request
       */
      function _loadImgs(srcList, callback, poolName, copies) {
        var promises = [];
        angular.forEach(srcList, function (imgSrc) {
          var dfd = $q.defer();
          _loadImg(imgSrc, function (img) {
            $rootScope.$apply(function () {
              dfd.resolve(img);
            });
          }, poolName, copies);
          promises.push(dfd.promise);
        });

        $q.all(promises)
        .then(function (resList) {
          if (angular.isFunction(callback)) {
            callback(resList);
          }
        });
        return promises;
      }

      return function loadImg(src, callback, poolName, copies) {
        if (angular.isArray(src)) {
          return _loadImgs(src, callback, poolName, copies);
        }
        return _loadImg(src, callback, poolName, copies);
      };
    }
  ];

  return __provides;
})

/**
 * @ngdoc directive
 * @name ngImg.ngImg
 *
 * @description
 * Communicates with $imgPool to retrive / put back image.
 *
 * @param {string}  ng-img  the image src, will be queried from the pool.
 */
.directive('ngImg', [
         '$imgPool', '$log',
function ($imgPool,   $log) {
  return {
    restrict: 'EA',
    controller: [function () {
      // empty controller for other directives requirements
    }],
    compile: function(tElm, tAttrs, transclude) {
      tElm.html('');
      return function postLink(scope, iElm, iAttrs) {
        var pool = $imgPool(iAttrs.pool);

        // listen for $destroy
        scope.$on('$destroy', function () {
          var $img = iElm.find('img');

          if ($img.length > 0 ) {
            $img.remove();
            pool.put($img.prop('src'), $img[0]);
          }
        });

        // observe as string
        iAttrs.$observe('ngImg', function (src) {
          var $img = iElm.find('img'),
              newImg;

          if (angular.isDefined(src)) {
            if ($img.length === 0) {
              // new
              newImg = pool.get(src);
              if (newImg) {
                iElm.append(newImg);
              }
              else {
                $log.error('$imgPool failed to hit.', src);
              }
            }
            else if ($img.prop('src') !== src) {
              // change
              newImg = pool.get(src);
              if (newImg) {
                iElm.append(newImg);
                $img.remove();
                pool.put($img.prop('src'), $img[0]);
              }
              else {
                $log.error('$imgPool failed to hit.', src);
              }
            }
          }
        });

      };
    }
  };
}])

.directive('ngImgClass', [function () {
  var dirName = 'ngImgClass';
  return {
    require: 'ngImg',
    restrict: 'A',
    link: function(scope, iElm, iAttrs) {
      // reference: ngClass.js
      var oldVal;

      scope.$watch(iAttrs[dirName], watchAction, true);

      iAttrs.$observe('class', function(value) {
        var dClass = scope.$eval(iAttrs[dirName]);
        watchAction(dClass, dClass);
      });

      function watchAction(newVal) {
        if (oldVal && !equals(newVal,oldVal)) {
          removeClass(oldVal);
        }
        addClass(newVal);
        oldVal = copy(newVal);
      }

      function removeClass(classVal) {
        if (isObject(classVal) && !isArray(classVal)) {
          classVal = map(classVal, function(v, k) { 
            if (v) {
              return k;
            }
          });
        }
        iElm.find('img').removeClass(isArray(classVal) ? classVal.join(' ') : classVal);
      }

      function addClass(classVal) {
        if (isObject(classVal) && !isArray(classVal)) {
          classVal = map(classVal, function(v, k) {
            if (v) {
              return k;
            }
          });
        }
        if (classVal) {
          iElm.find('img').addClass(isArray(classVal) ? classVal.join(' ') : classVal);
        }
      }

      function isObject(val) {
        return angular.isObject(val);
      }

      function isArray(val) {
        return angular.isArray(val);
      }

      function equals(valA, valB) {
        return angular.equals(valA, valB);
      }

      function copy(val) {
        return angular.copy(val);
      }

      function map(obj, iterator, context) {
        var results = [];
        angular.forEach(obj, function(value, index, list) {
          results.push(iterator.call(context, value, index, list));
        });
        return results;
      }
    }
  };
}]);
