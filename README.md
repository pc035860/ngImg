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

## Usage

`ngImg` is mainly composed of two *services* - `$imgPool`, `$loadImg` and a *directive* `ngImg` (with `ngImgClass`).

### $imgPool

`$imgPool` helps you to create pool instances of cached images, indexed by `src` property of images.

**Features:**

* Implemented with `$cacheFactory`. The pool instance created by calling `$imgPool` has the same interface with the cache instance created by calling `$cacheFactory`
* May have multiple copies of value indexed by the same `src`
* The times you `put` the image is the exact times you can `get` the image

### $loadImg

A image loader function with handy features.

**Features:**

* Internally maintains a request queue, in order to reduce the request blockings on the same domain in the browser. The request limit is configurable.
* Loads images direcly into the specified `$imgPool` instance without getting hands dirty.

### ngImg

A directive for getting loaded images direcly from the `$imgPool` instance.

**Features:**

* Automatically put images back to `$imgPool` instances if images that are not in use
* "Put image" rather than "load image"(like `ng-src`)
