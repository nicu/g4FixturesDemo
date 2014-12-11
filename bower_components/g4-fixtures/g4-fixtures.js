/* global amplify */
(function() {
  'use strict';

  angular.module('g4Fixtures', ['ngMockE2E'])
    .provider('fixtureDb', function() {
      // this is the "amplify" store key where we store
      // the original JSON objects that we compare against
      // when determining if the local data changed
      var ORIGINAL_FIXTURES_KEY = 'fixtures';

      // keep track of all the fixtures being set in this session
      // later, we need to define default resource routes for all these fixtures
      // if they will not be overwritten in code
      var collections = {};

      this.getCollections = function() {
        return collections;
      };

      // whenever a route is defined for a request
      // look for a possible match against the fixtureDb so we know
      // if we still need to generate a default route for this collection
      // or a developer overwritten this
      this.markURL = function(url) {
        var bits = url.substring(1).split('/'),
          name = bits.length ? bits[0] : null;

        if (name && collections.hasOwnProperty(name)) {
          collections[name] = true;
        }
      };

      /**
       * Stores a fixture in the amplify store.
       * If the value value was set previously, it won't be set again,
       * even if the users might have changed the data, in the browser.
       *
       * However, changing the data in the code, it will overwrite the store data.
       * @param {String} key
       * @param {Object} value
       */
      this.setInitialData = function(key, value) {
        // check if value is already set
        var isSet = amplify.store(key),
          // get the original fixtures
          dict = amplify.store(ORIGINAL_FIXTURES_KEY) || {},
          // pick the original fixture for the current collection
          original = dict[key],
          data = null,
          // check if the data changed since last saved
          dataChanged = !angular.equals(original, value);

        // initialise data if not set for this key
        // or if local fixture data changed
        if (!isSet || dataChanged) {
          amplify.store(key, value);

          // save a copy of this data so we can tell
          // if it changes in the future
          dict[key] = value;
          amplify.store(ORIGINAL_FIXTURES_KEY, dict);
        }

        // we don't have a route defined for this fixture, yet
        collections[key] = false;
      };

      /**
       * Get fixture data, by name.
       * @param  {String} key [description]
       * @return {Object}
       */
      this.getData = function(key) {
        return amplify.store(key);
      };

      this.$get = function() {
        return this;
      };
    })

  /**
   * ***************************************************************************************
   * A backend for fixtures that will load data from the fixtureDb and handle
   * retreival, creation, updating and deleting items from the store (which is persistent).
   * ***************************************************************************************
   */
  .provider('fixtureStore', ['fixtureDbProvider', function(fixtureDbProvider) {
    // shortcut function that rearranges the order of arguments
    // (I don't like Angular's default order :-) )
    var response = function(code, status, body, headers) {
      return [code, body, headers, status];
    };

    /**
     * Returns a HTTP status code of 200, with the text "OK".
     * The body of the response will check if the data is an array and initialise
     * with an "items" property, or the singular "item" otherwise
     * @param  {Object} body    The HTTP response body
     * @param  {Object} headers Additional HTTP headers
     * @return {Array} returns [code, body, headers, status] ($httpBackend compatible)
     */
    var res200OK = function(body, headers) {
      var res = {};

      if (angular.isArray(body)) {
        // collection
        res.items = body;
      }
      else {
        // single item
        res.item = body;
      }

      return response(200, 'OK', {
        body: res
      }, headers);
    };

    /**
     * Returns a 404 error
     * @param  {Object} body    The HTTP response body
     * @param  {Object} headers Additional response headers
     * @return {Array} returns [code, body, headers, status] ($httpBackend compatible)
     */
    var err404NotFound = function(body, headers) {
      return response(404, 'Not found', {
        error: {
          code: 404,
          message: 'Item not found'
        }
      }, {});
    };

   /**
    * StoreBackend class.
    * This class handles operations like findAll, findOne, create, update, delete.
    * @param {String} name Optional name for the 'amplify' store.
    */
   var StoreBackend = function(name) {
     // keep a reference to the store name, used when data changes
     this.name = name;
     // if a store name is give, read the items form there,
     // otherwise initialise with empty array
     this.items = name ? (amplify.store(name) || []) : [];
   };

   /**
    * Saves the data in the 'amplify' store, if one was specified
    * @param {Object} data Data to store
    */
   StoreBackend.prototype.setData = function(data) {
     if (this.name) {
       // only update the DB if we created this class with a store name
       amplify.store(this.name, this.items);
     }
   };

   /**
    * Returns the data form the 'amplify' store, if specified.
    * @return {Object} Data stored in the local 'amplify' store.
    */
    StoreBackend.prototype.getData = function() {
      if (this.name) {
        this.items = amplify.store(this.name);
      }

      return this.items;
    };

    /**
     * Helper method that returns the index of an object
     * in the store's items array, based on the object's 'id' property.
     * @param  {Number|String} id ID of the object
     * @return {Number} Index of object in the array. -1 if not found.
     *
     * NOTE: if we need to support objects indexed by other properties
     * instead of 'id', let's say 'providerID', this is the method where
     * we'd need to take the property name as a parameter.
     * All of the methods below would also need to be able to pass that
     * value along.
     */
    StoreBackend.prototype.findIndexByID = function(id) {
      for (var i = 0, l = this.items.length; i < l; i = i + 1) {
        // compare the ids as string, just in case we use non numeric ones
        if (this.items[i].id.toString() === id.toString()) {
          return i;
        }
      }

      return -1;
    };

    /**
     * Helper method that looks up an object inside the store's items.
     * @param  {String|Number} id ID of the object
     * @return {Object} Object or null.
     */
    StoreBackend.prototype.findByID = function(id) {
      var index = this.findIndexByID(id);
      if (index === -1) {
        return null;
      }

      return this.items[index];
    };

    /**
     * Returns the entire collection of the current store.
     * @return {Array} All the items in the store.
     *
     * NOTE:
     *   1. Initially I implemented stricter rules, including emitting 404's
     *   if there was nothing defined in the store before doing the findAll
     *   but it might be overkill for this, so I removed it
     *
     *   2. This is a good place to implement sorting / filtering, if needed
     */
    StoreBackend.prototype.findAll = function() {
      return res200OK(this.items);
    };

    /**
     * Returns the item with the specified ID
     * @param  {Number|String} id Item's ID
     * @return {Object}    Item with the given id.
     */
    StoreBackend.prototype.findOne = function(id) {
      var item = this.findByID(id);

      if (!item) {
        return err404NotFound;
      }

      return res200OK(item);
    };

    /**
     * Creates a new item and stores it
     * @param  {Object} data Item properties
     * @return {Object}      The newly created item
     */
    StoreBackend.prototype.create = function(data) {
      if (data.id) {
        return response(400, 'Invalid data', {
          text: 'You can\'t set the id when creating a new item.'
        });
      }

      // find the current maximum id in the store
      var maxID = 0;
      for (var i = 0, l = this.items.length; i < l; i = i + 1) {
        if (this.items[i].id > maxID) {
          maxID = this.items[i].id;
        }
      }

      // increment by 1
      maxID = maxID + 1;
      data.id = maxID;

      // add the item to the list
      this.items.push(data);
      // persist the list
      this.setData(this.items);

      // return the item
      return res200OK(data);
    };

    /**
     * Updates the data for a given item
     * @param  {Number|String} id   Id of the item to update
     * @param  {Object} data Item properties and values
     * @return {Object}      The newly updated item
     */
    StoreBackend.prototype.update = function(id, data) {
      var item = this.findByID(id);

      // return a 404 Not Found error if the item
      // is not in the list
      if (!item) {
        return err404NotFound();
      }

      // update the list
      angular.extend(item, data);
      // persist the list
      this.setData(this.items);

      // return the item
      return res200OK(item);
    };

    /**
     * Delete an item from the store
     * @param  {Number|String} id ID of the item to delete
     * @return {Object}    Returns the removed item
     */
    StoreBackend.prototype.delete = function(id) {
      var item = null,
        index = this.findIndexByID(id);

      // return a 404 Not Found error if the item
      // is not in the list
      if (index === -1) {
        return err404NotFound();
      }

      // remove the item
      item = this.items[index];
      this.items.splice(index, 1);
      // persist the list
      this.setData(this.items);

      // return the item
      return res200OK(item);
    };

    // when creating a provider instance
    // we return the StoreBackend class
    this.$get = function() {
      return StoreBackend;
    };
  }])

  /**
   * **********************************************************************************
   * Provider that maps URL requests to JSON responses
   * **********************************************************************************
   */
  .provider('fixtures', ['fixtureStoreProvider', 'fixtureDbProvider', function(fixtureStoreProvider, fixtureDbProvider) {
    // alias the class name returned by the fixtureStoreProvider so that JSLint doesn't complain when instantiating the store
    // that's why we use uppercase here
    var FixtureStore = fixtureStoreProvider.$get();

    /**
     * Escapes a string so that it can be used to create a RegExp object from it
     * @param  {String} text regexp
     * @return {String}      Escaped string
     */
    var escapeRegexp = function(text) {
      return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    /**
     * Wa want to have a better code separation and still be able to use the $httpBacked
     * which is only injected when the provider in instantiated.
     *
     * In order to have it available we would have had to define all these methods inside our '$get' method
     * because that's where the $httpBackend can be injected and available as a closure for all the methods below.
     *
     * As a result, we store the $httpBackend instance inside our class and use it like that.
     *
     * @param {Object} httpBackend Reference to a $httpBackend object
     */
    this.setHTTPBackend = function(httpBackend) {
      this.httpBackend = httpBackend;
    };

    /**
     * Replaces URLs like '/todos/{id}' into '\/todos\/(.+)' so it can be used by $httpBackend to catch requests
     * to dynamic URLs.
     *
     * This method helps us define easier dynamic URLs, using strings instead of regular expressions
     *
     * Image we have a url: '/blog/{article_id}-{article_title}/comments'
     * If we want to transform this to a regular expression we want to preserve '/blog/', '-' and '/comments' as plain string
     * when we do the matching and everything between '{' and '}' to be replaced with regular expressions.
     * We do this in 3 steps.
     *   1. replace all the dynamic args with a random string that has little chance of being use by the URL.
     *     => /blog/__HTTP_ARG__-__HTTP_ARG__/comments
     *   2. The result can now be safely escaped for Regex to be used as is (string)
     *     => \/blog\/__HTTP_ARG__\-__HTTP_ARG__\/comments
     *   3. We can now add actual regex rules by replacing all instances of what we know to be dynamic args, with regexp
     *     => \/blog\/(.+)\-(.+)\/comments
     * We now have a regular expression that we can use with $httpBackend.
     *
     * @param  {String} url URL with dynamic arguments using the '{}' format
     * @return {RegExp}     RegExp object that can be used in $httpBackend's when{GET|POST|PUT|DELETE} methods
     */
    this.regexURL = function(url) {
      var pattern = '^' + escapeRegexp(url.replace(/\{.+?\}/ig, '__HTTP_ARG__')).replace(/__HTTP_ARG__/ig, '(.+)') + '$';
      return new RegExp(pattern);
    };

    /**
     * Creates a hash where the keys are the dynamically named arguments in a URL (ex. {id}, {year})
     * and the values are the bits of text that actually match the arguments when the request is made.
     *
     * Example:
     *   URL    = '/blog/{year}/{month}/{id}-{title}'
     *   Values = [2014, 10, 1, 'getting-started-with-angularjs']
     *
     *   The result will be: {year: 2014, month: 10, id: 1, title: 'getting-started-with-angularjs'}
     *
     * @param  {String} url    Dynamic url string
     * @param  {Array} values  Array of matches for the dynamic URL's arguments
     * @return {Object}        Hash of combined arguments/values
     */
    this.parseURL = function(url, values) {
      var regex = /\{(.*?)\}/ig,
        match = regex.exec(url),
        response = {},
        i = 0;

      // as long as we can find a text like: {something}
      // we keep matching it with the next value in line
      while (match) {
        if (match.length > 1) {
          response[match[1]] = values[i];
          i = i + 1;
        }

        match = regex.exec(url);
      }

      return response;
    };

    /**
     * Connects an HTTP request to a dynamic URL string with a function that returns data for the HTTP request.
     * @param  {String}   httpVerb GET | POST | PUT | DELETE
     * @param  {String}   url      Dynamic url (meaning you can name your arguments like /todos/{id})
     * @param  {Function} fn       Function that takes the request arguments/data and generates a response
     */
    this.mockRequest = function(httpVerb, url, fn) {
      var self = this,
        verb = httpVerb.toUpperCase(),
        method = 'when' + verb,
        regexURL = this.regexURL(url),
        args = [];

      this.httpBackend[method](regexURL).respond(function(reqMethod, reqUrl, reqData, reqHeaders) {
        // we have the dynamic argument names in the 'url' variable (available as a closure) (ex. /todos/{id})
        // we also have the actual requested URL, so we can find out the value for 'id' (ex. /todos/1)
        var match = regexURL.exec(reqUrl);
        if (match && match.length > 1) {
          // the first element in the match array is always the entire matched string
          // we're only interested in the group matches, so we can remove the first element
          match.shift();

          // as said before, we know the dynamic url from our 'url' variable and that's where we have all the names
          // for the arguments
          // we now also have an array of all the values for those names, in the 'match' array
          // all we have to do is to combine them together and we'll have an object like: {id: 1} // for the example above
          args = self.parseURL(url, match);
        }

        // we call the response generator function, passing the arguments/values as the first parameter
        // the request data as the second parameter (used in create/update)
        // and the last, optional parameter are the request headers
        return fn.call(this, args, reqData ? JSON.parse(reqData) : reqData, reqHeaders);
      });

      // whenever we mapped a route for a URL, we try to mark it as a possible overwrite for a stored JSON
      // so that we won't generate default routes for it
      fixtureDbProvider.markURL(url);
    };

    this.whenGET = function(url, fn) {
      this.mockRequest('GET', url, fn);
    };

    this.whenPOST = function(url, fn) {
      this.mockRequest('POST', url, fn);
    };

    this.whenPUT = function(url, fn) {
      this.mockRequest('PUT', url, fn);
    };

    this.whenDELETE = function(url, fn) {
      this.mockRequest('DELETE', url, fn);
    };

    /**
     * Shortcut to generate all default REST routes for a given resource
     * @param  {String} collectionURL Dynamic url that points to the URL that would return the entire collection
     * @param  {String} itemURL       Dynamic url that points to the URL that would return a single item from the collection, by ID
     * @param  {String} name          Name for the collection. Usually matches a JSON file with the same name, without the extension. Used as a key in the 'amplify' store.
     */
    this.resource = function(collectionURL, itemURL, name) {
      // itemURL is optional
      // if only 2 arguments were provided, assume collectionURL and name
      if (! name) {
        name = itemURL;
        // autogenerate the itemURL (based on REST conventions)
        itemURL = collectionURL + '/{id}';
      }

      // initialise a store with the name of the resource
      var store = new FixtureStore(name);

      // the following methods connect the HTTP request url with the actual function

      this.whenGET(itemURL, function(args) {
        return store.findOne(args.id);
      });

      this.whenPUT(itemURL, function(args, reqData) {
        return store.update(args.id, reqData);
      });

      this.whenDELETE(itemURL, function(args) {
        return store.delete(args.id);
      });

      this.whenGET(collectionURL, function(args) {
        return store.findAll();
      });

      this.whenPOST(collectionURL, function(args, reqData) {
        return store.create(reqData);
      });
    };

    /**
     * // TODO find a better name
     * This function generates routes for the JSON files that don't have any specified and
     * defines passthrough routes for any request.
     *
     * This works because it should be the last thing that executes before the applciation starts
     * and all routes should have been defined by now
     *
     * Adding passThrough for everything else, means that we can also have requests to real services
     * side by side with our mock ones.
     */
    this.run = function() {
      var self = this,
        collections = fixtureDbProvider.getCollections();

      // all the collections that were added from JSON files
      // and are not configured yet
      // will be configured as resources
      angular.forEach(collections, function(isConfigured, key) {
        if (!isConfigured) {
          self.resource('/' + key, '/' + key + '/{id}', key);
        }
      });

      // let all the other requests pass through
      this.httpBackend.whenGET(/.*/).passThrough();
      this.httpBackend.whenPOST(/.*/).passThrough();
      this.httpBackend.whenPUT(/.*/).passThrough();
      this.httpBackend.whenDELETE(/.*/).passThrough();
    };

    this.$get = ['$httpBackend', function($httpBackend) {
      // httpBackend is only available in the "run" blocks
      // initialising the httpBackend here so it's available in our provider
      this.setHTTPBackend($httpBackend);
      return this;
    }];
  }]);
})();