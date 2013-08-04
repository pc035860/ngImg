# ngImg

Best friend of handcrafted image loading in AngularJS.

From time to time, we may face a cerntain situation that required to preload images and present them at the right moment.

`ngImg` is just the right module for these kind of situations.

#### [Demo](http://plnkr.co/edit/vmhIet?p=preview)


## Requirements

AngularJS v1.0.1+

(only tested in v1.1.5, but should work fine in other versions)


## Getting started

Include `ngImg` module with AngularJS script in your page.
```html
<script src="//ajax.googleapis.com/ajax/libs/angularjs/1.1.5/angular.min.js"></script>
<script src="http://pc035860.github.io/ngSelect/ngImg.min.js"></script>
```

Add `ngImg` to your app module's dependency.
```js
angular.module('myApp', ['ngImg']);
```

## Meet the family

`ngImg` is mainly composed of two *services* - `$imgPool`, `$loadImg` and a *directive* `ngImg` (with `ngImgClass`).

### $imgPool (service)

`$imgPool` helps you to create pool instances of cached images, indexed by `src` property of images.

* Implemented with `$cacheFactory`. The pool instance created by calling `$imgPool` has the same interface with the cache instance created by calling `$cacheFactory`
* May have multiple copies of value indexed by the same `src`
* The times you `put` the image is the exact times you can `get` the image

##### Configuration

* `flushOnRouteChange` - {boolean} - flush all $imgPool instances on route change (default `true`)
* `cacheIdPrefix` - {string} - cache factory instance id prefix for $imgPool (default `"$imgPool"`)
* `defaultPoolName` - {string} - default pool name for initialization if poolName not presented (default `"default"`)

```js
angular.module('myApp')

.config(['$imgPoolProvider', function($imgPoolProvider) {

  // read config
  // output: "$imgPool"
  console.log($imgPoolProvider.config('cacheIdPrefix'));

  // setting single config
  $imgPoolProvider.config('flushOnRouteChange', true);

  // setting multiple configs
  $imgPoolProvider.config({

    cacheIdPrefix: '$imgPool',

    defaultPoolName: 'default'
  });

}]);
```

##### Usage

```js
angular.module('myApp')

.run(['$imgPool', function($imgPool) {

  // create/get a pool
  var myPool = $imgPool('with a name');

  var src = 'a.png';

  var img1 = new Image();
  img1.src = src;

  // put in an image with key "a.png"
  myPool.put(src, img1);
  // {
  //   "a.png": [img1]
  // }

  // put in another one, now we have two of them at "a.png"
  myPool.put(src, img1);
  // {
  //   "a.png": [img1, img1]
  // }
  // 
  // note that img1@0 & img1@1 referenced to the same HTMLImageElement,
  // to make a clean copy, try this:
  // 
  //   myPool.put(src, img1.cloneNode(true));
  //   

  // make another copy of it when omitting second argument
  myPool.put(src);
  // {
  //   "a.png": [img1, img1, img1(clone)]
  // }

  // get one of them from the pool
  var img2 = myPool.get(src);
  // img2 === img1(clone)
  // {
  //   "a.png": [img1, img1]
  // }
}]);
```


### $loadImg (service)

A image loader function with handy features.

* Internally maintains a request queue, in order to reduce the request blockings on the same domain in the browser. The request limit is configurable.
* Loads images direcly into the specified `$imgPool` instance without getting hands dirty.

##### Configuration

* `requestLimit` - {number} - the limit for simultaneous image requsts (default `2`)

```js
angular.module('myApp')

.config(['$loadImgProvider', function($loadImgProvider) {

  // read config
  // output: 2
  console.log($loadImgProvider.config('requestLimit'));

  // setting config
  $loadImgProvider.config('requestLimit', 3);

}]);
```

##### Usage

Dealing with one image.

```js
angular.module('myApp')

.run(['$loadImg', function($loadImg) {
  var src = "b.png",
      poolName = "pc035860";

  // load one image
  $loadImg(src, function (res) {
    if (res) {
      // success: HTMLImageElement
    }
    else {
      // error: false
    }
  });
  // returns HTMLImageElement
  
  // load one image without callback
  $loadImg(src);
  // returns HTMLImageElement
  
  // load one image directly into pool 
  $loadImg(src, poolName);

  // load one image directly into pool, 3 copies
  $loadImg(src, poolName, 3);

  // load one image directly into pool, 3 copies, with callback
  $loadImg(src, function (res) {
    if (res) {
      // success: HTMLImageElement
    }
    else {
      // error: false
    }
  }, poolName, 3)

}]);
```

Dealing with multiple images. The differences between loading single image are the trigger timing of callback function and the returned value.
```js
angular.module('myApp')

.run(['$loadImg', function($loadImg) {
  var srcList = ["c.png", "d.png", "e.png"],
      poolName = "pc035860";

  $loadImg(srcList, function(resList) {
    // callback function triggered after all requests finished (either success or error)
    
    angular.forEach(resList, function (res) {
      if (res) {
        // success: HTMLImageElement
      }
      else {
        // error: false
      }
    });
  });
  // returns [promise(c.png), promise(d.png), promise(e.png)]
  // in case you need individually manipulation
}]);
```


### ng-img (directive)

A directive for getting loaded images direcly from the `$imgPool` instance.

* Automatically put images back to `$imgPool` instances if images that are not in use
* "Put image" rather than "load image"(like `ng-src`)
* HTML `class` attribute can still be applied to the `<img>` with `ng-img-class`

##### Usage

```html
<div class="some-content">
  <!-- get an image from pool "default" with src "a.png" -->
  <div ng-img="a.png" pool="default"></div>

  <!-- get an image from pool "pc035860" with src "c.png" -->
  <div ng-img="c.png" pool="pc035860"></div>

  <!-- get an image from pool "pc035860" with src "c.png" -->
  <div ng-img="c.png" pool="pc035860"></div>

  <!-- get an image from pool "pc035860" with src "d.png", add class "img-rounded" to the image  -->
  <div ng-img="d.png" pool="pc035860" ng-img-class="'img-rounded'"></div>
</div>
```

And the output will be: (with consideration of the js usage code above)

```html
<div class="some-content">
  <!-- get an image from pool "default" with src "a.png" -->
  <div ng-img="a.png" pool="default">
    <img src="a.png">
  </div>

  <!-- get an image from pool "pc035860" with src "c.png" -->
  <div ng-img="c.png" pool="pc035860">
    <img src="c.png">
  </div>

  <!-- get an image from pool "pc035860" with src "c.png" -->
  <div ng-img="c.png" pool="pc035860">
    <!-- empty here, since there's nothing left in the pool for "c.png" -->
  </div>

  <!-- get an image from pool "pc035860" with src "d.png", add class "img-rounded" to the image  -->
  <div ng-img="d.png" pool="pc035860" ng-img-class="'img-rounded'">
    <img class="img-rounded" src="d.png">
  </div>
</div>
```

## See them in action

Currently no live examples available, but the demo at top basically is a full-featured example.

Watch the [demo](https://github.com/pc035860/ngImg#demo) and feel free to ask questions if you still can't figure them out.
